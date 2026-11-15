import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function getScanDirs() {
  const custom = process.env.WORKTREE_SCAN_DIRS;
  if (custom) {
    return custom
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
  }
  // Default: scan parent directory of the current project
  return [path.resolve(process.cwd(), '..')];
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  '.cache',
  'lost+found',
  '.Trash-1000',
  '.trash',
]);

let cachedWorktrees = null;
let cachedAt = 0;
const WORKTREE_TTL_MS = 30_000;

function parseRepoSlug(remoteUrl) {
  if (!remoteUrl) return null;
  const trimmed = remoteUrl.trim();
  const match = trimmed.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/i);
  return match ? match[1].toLowerCase() : null;
}

async function hasGitEntry(dirPath) {
  try {
    await fs.stat(path.join(dirPath, '.git'));
    return true;
  } catch {
    return false;
  }
}

async function listCandidateGitDirs() {
  const candidates = [];
  for (const baseDir of getScanDirs()) {
    let entries = [];
    try {
      entries = await fs.readdir(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = path.join(baseDir, entry.name);
      if (await hasGitEntry(fullPath)) {
        candidates.push(fullPath);
      }
    }
  }
  return candidates;
}

function parseWorktreePorcelain(output, repoSlug, repoDirName) {
  const blocks = output.trim().split(/\n\s*\n/);
  const items = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    let wtPath = null;
    let head = null;
    let branch = null;
    let bare = false;

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        wtPath = line.slice('worktree '.length).trim();
      } else if (line.startsWith('HEAD ')) {
        head = line.slice('HEAD '.length).trim();
      } else if (line.startsWith('branch ')) {
        const ref = line.slice('branch '.length).trim();
        branch = ref.replace(/^refs\/heads\//, '');
      } else if (line === 'bare') {
        bare = true;
      }
    }

    if (wtPath && !bare) {
      items.push({
        path: wtPath,
        head: head ? head.slice(0, 8) : null,
        branch,
        repoSlug,
        repoDirName: repoDirName.toLowerCase(),
      });
    }
  }
  return items;
}

async function inspectRepoWorktrees(repoDir) {
  try {
    const [{ stdout: wtOut }, { stdout: remoteOut }] = await Promise.all([
      execFileAsync('git', ['-C', repoDir, 'worktree', 'list', '--porcelain'], {
        timeout: 4000,
      }),
      execFileAsync('git', ['-C', repoDir, 'remote', 'get-url', 'origin'], {
        timeout: 3000,
      }).catch(() => ({ stdout: '' })),
    ]);

    const repoSlug = parseRepoSlug(remoteOut);
    return parseWorktreePorcelain(wtOut, repoSlug, path.basename(repoDir));
  } catch {
    return [];
  }
}

export async function scanLocalWorktrees(force = false) {
  const now = Date.now();
  if (!force && cachedWorktrees && now - cachedAt < WORKTREE_TTL_MS) {
    return cachedWorktrees;
  }

  const dirs = await listCandidateGitDirs();
  const settled = await Promise.all(dirs.map(inspectRepoWorktrees));
  const seenPaths = new Set();
  const worktrees = [];

  for (const group of settled) {
    for (const wt of group) {
      if (!seenPaths.has(wt.path)) {
        seenPaths.add(wt.path);
        worktrees.push(wt);
      }
    }
  }

  cachedWorktrees = worktrees;
  cachedAt = now;
  return worktrees;
}

export function matchWorktreeForPr(pr, worktrees) {
  if (!pr || !worktrees?.length) return null;
  const prRepoSlug = pr.repo?.toLowerCase();
  const prRepoName = pr.repoName?.toLowerCase();
  const headBranch = pr.headRefName;

  // 1. Exact match by repoSlug + branch
  const exactRepoAndBranch = worktrees.find(
    (wt) => wt.branch === headBranch && wt.repoSlug && wt.repoSlug === prRepoSlug
  );
  if (exactRepoAndBranch) {
    return { path: exactRepoAndBranch.path, branch: exactRepoAndBranch.branch };
  }

  // 2. Match by repository directory name + branch
  const nameAndBranch = worktrees.find(
    (wt) => wt.branch === headBranch && prRepoName && wt.repoDirName === prRepoName
  );
  if (nameAndBranch) {
    return { path: nameAndBranch.path, branch: nameAndBranch.branch };
  }

  // 3. Match by non-generic branch name (excluding main/master)
  if (headBranch && headBranch !== 'main' && headBranch !== 'master') {
    const branchMatch = worktrees.find((wt) => wt.branch === headBranch);
    if (branchMatch) {
      return { path: branchMatch.path, branch: branchMatch.branch };
    }
  }

  return null;
}

export async function executeLocalRebase(worktreePath, baseBranch = 'main') {
  if (!worktreePath) {
    throw new Error('Worktree path not provided');
  }

  // 1. Check whether working tree is clean
  try {
    const { stdout: statusOut } = await execFileAsync(
      'git',
      ['-C', worktreePath, 'status', '--porcelain'],
      { timeout: 5000 }
    );
    if (statusOut.trim().length > 0) {
      return {
        ok: false,
        status: 'dirty',
        message: 'Worktree has uncommitted changes. Commit or stash changes before rebasing.',
      };
    }
  } catch (err) {
    throw new Error(`Failed to check git status: ${err.message}`);
  }

  // 2. Fetch origin baseBranch
  try {
    await execFileAsync(
      'git',
      ['-C', worktreePath, 'fetch', 'origin', baseBranch],
      { timeout: 30000 }
    );
  } catch (err) {
    throw new Error(`Failed git fetch origin ${baseBranch}: ${err.message}`);
  }

  // 3. Execute git rebase origin/baseBranch
  try {
    await execFileAsync(
      'git',
      ['-C', worktreePath, 'rebase', `origin/${baseBranch}`],
      { timeout: 30000 }
    );
    const { stdout: headOut } = await execFileAsync(
      'git',
      ['-C', worktreePath, 'rev-parse', '--short', 'HEAD'],
      { timeout: 3000 }
    );
    return {
      ok: true,
      status: 'success',
      message: `Rebase with origin/${baseBranch} completed successfully!`,
      newHead: headOut.trim(),
    };
  } catch (err) {
    // Check for merge conflicts
    try {
      const { stdout: diffOut } = await execFileAsync(
        'git',
        ['-C', worktreePath, 'diff', '--name-only', '--diff-filter=U'],
        { timeout: 5000 }
      );
      const conflictedFiles = diffOut.trim().split('\n').filter(Boolean);
      return {
        ok: false,
        status: 'conflict',
        message: 'Conflicts detected during rebase.',
        conflictedFiles,
        canAbort: true,
      };
    } catch {
      return {
        ok: false,
        status: 'error',
        message: `Rebase failed: ${err.message}`,
        canAbort: true,
      };
    }
  }
}

export async function abortLocalRebase(worktreePath) {
  try {
    await execFileAsync('git', ['-C', worktreePath, 'rebase', '--abort'], {
      timeout: 10000,
    });
    return {
      ok: true,
      status: 'aborted',
      message: 'Rebase aborted successfully.',
    };
  } catch (err) {
    throw new Error(`Failed to abort rebase: ${err.message}`);
  }
}

export async function pushLocalRebase(worktreePath, headBranch) {
  if (!headBranch) {
    throw new Error('Head branch not provided for push');
  }
  try {
    await execFileAsync(
      'git',
      ['-C', worktreePath, 'push', '--force-with-lease', 'origin', headBranch],
      { timeout: 30000 }
    );
    return {
      ok: true,
      status: 'pushed',
      message: `Push with --force-with-lease to origin/${headBranch} completed successfully!`,
    };
  } catch (err) {
    throw new Error(`Git push failed: ${err.message}`);
  }
}
