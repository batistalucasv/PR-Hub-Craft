import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyPR,
  executeGhPrAction,
  fetchAllMyPRs,
  fetchPRDetails,
} from './github.js';
import {
  readPrCache,
  readUserState,
  updateUserState,
  writePrCache,
} from './store.js';
import {
  matchWorktreeForPr,
  scanLocalWorktrees,
  executeLocalRebase,
  abortLocalRebase,
  pushLocalRebase,
} from './worktrees.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const PORT = Number.parseInt(process.env.PORT || '4321', 10);
const CACHE_TTL_MS = 10 * 60 * 1000;

const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3', null]);
const VALID_WORK_STATUSES = new Set(['executando', 'parado', 'terminado', null]);
const VALID_STAGES = new Set([
  'problema',
  'revisar',
  'finalizado',
  'revisado',
  'aprovado',
  'corrigir_conflito_ci',
  'resolver_feedback',
  'finalizar',
  'aguardando',
  'arquivado',
  null,
]);

function normalizeStage(stage) {
  if (!stage) return stage;
  if (stage === 'corrigir_conflito_ci') return 'problema';
  if (stage === 'resolver_feedback') return 'revisar';
  if (stage === 'finalizar') return 'finalizado';
  if (stage === 'aguardando') return 'revisado';
  return stage;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  let totalSize = 0;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > 2 * 1024 * 1024) {
      throw new Error('Payload too large');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function computeAutoTags(classified, localState, localWorktree) {
  // Whitelabel: No forced thematic tags.
  // Tags are fully managed and created by the user.
  return [];
}

function buildPrPayload(cache, userState, worktrees) {
  const viewerLogin = cache.viewer?.login || '';
  const nowMs = Date.now();

  const prs = (cache.rawPrs || []).map((raw) => {
    const classified = classifyPR(raw, viewerLogin, nowMs);
    const localState = userState.prs[classified.prKey] || {};
    const stage = normalizeStage(localState.manualStage || classified.autoStage);
    const localWorktree = matchWorktreeForPr(classified, worktrees);
    const autoTags = computeAutoTags(classified, localState, localWorktree);
    const manualTags = Array.isArray(localState.tags) ? localState.tags : [];
    const removedTags = Array.isArray(localState.removedTags) ? localState.removedTags : [];
    const tags = Array.from(
      new Set([
        ...autoTags.filter((tag) => !removedTags.includes(tag)),
        ...manualTags,
      ])
    );

    return {
      ...classified,
      stage,
      manualStage: localState.manualStage ?? null,
      priority: localState.priority ?? null,
      workStatus: VALID_WORK_STATUSES.has(localState.workStatus) ? localState.workStatus : null,
      selectedForToday: Boolean(localState.selectedForToday),
      tags,
      autoTags,
      manualTags,
      notes: typeof localState.notes === 'string' ? localState.notes : '',
      checklist: Array.isArray(localState.checklist) ? localState.checklist : [],
      discordSentAt: localState.discordSentAt ?? null,
      localWorktree,
    };
  });

  const stats = {
    total: prs.length,
    focus: prs.filter((p) => p.selectedForToday && p.stage !== 'arquivado').length,
    problema: prs.filter((p) => p.stage === 'problema' || p.stage === 'corrigir_conflito_ci').length,
    revisar: prs.filter((p) => p.stage === 'revisar' || p.stage === 'resolver_feedback').length,
    finalizado: prs.filter((p) => p.stage === 'finalizado' || p.stage === 'finalizar').length,
    revisado: prs.filter((p) => p.stage === 'revisado' || p.stage === 'aguardando').length,
    aprovado: prs.filter((p) => p.stage === 'aprovado').length,
    arquivado: prs.filter((p) => p.stage === 'arquivado').length,
    slaAlert: prs.filter((p) =>
      ['warning_7d', 'overdue_7d', 'overdue_14d', 'danger_30d'].includes(p.sla?.status)
    ).length,
    withWorktree: prs.filter((p) => Boolean(p.localWorktree)).length,
    quickWinConflicts: prs.filter(
      (p) => p.isQuickWinConflict && p.stage !== 'arquivado'
    ).length,
    readyForDiscord: prs.filter(
      (p) =>
        p.role === 'author' &&
        !p.hasConflict &&
        !p.hasCiFailure &&
        !p.isDraft &&
        p.stage !== 'arquivado'
    ).length,
  };

  return {
    viewer: cache.viewer,
    rateLimit: cache.rateLimit,
    syncedAt: cache.syncedAt,
    issueCount: cache.issueCount ?? prs.length,
    fromCache: Boolean(cache.fromCache),
    prs,
    customTags: userState.customTags,
    stats,
  };
}

function applyStatePatch(existing = {}, patch = {}) {
  const next = {
    priority: existing.priority ?? null,
    workStatus: VALID_WORK_STATUSES.has(existing.workStatus) ? existing.workStatus : null,
    manualStage: existing.manualStage ?? null,
    selectedForToday: Boolean(existing.selectedForToday),
    tags: Array.isArray(existing.tags) ? [...existing.tags] : [],
    removedTags: Array.isArray(existing.removedTags) ? [...existing.removedTags] : [],
    notes: typeof existing.notes === 'string' ? existing.notes : '',
    checklist: Array.isArray(existing.checklist) ? [...existing.checklist] : [],
    discordSentAt: existing.discordSentAt ?? null,
  };

  if ('priority' in patch && VALID_PRIORITIES.has(patch.priority)) {
    next.priority = patch.priority;
  }
  if ('workStatus' in patch && VALID_WORK_STATUSES.has(patch.workStatus)) {
    next.workStatus = patch.workStatus;
  }
  if ('manualStage' in patch && VALID_STAGES.has(patch.manualStage)) {
    next.manualStage = patch.manualStage;
  }
  if ('selectedForToday' in patch && typeof patch.selectedForToday === 'boolean') {
    next.selectedForToday = patch.selectedForToday;
  }
  if ('tags' in patch && Array.isArray(patch.tags)) {
    next.tags = Array.from(new Set(patch.tags.filter((t) => typeof t === 'string')));
  }
  if ('addTag' in patch && typeof patch.addTag === 'string') {
    if (!next.tags.includes(patch.addTag)) {
      next.tags.push(patch.addTag);
    }
    next.removedTags = next.removedTags.filter((t) => t !== patch.addTag);
  }
  if ('removeTag' in patch && typeof patch.removeTag === 'string') {
    next.tags = next.tags.filter((t) => t !== patch.removeTag);
    if (!next.removedTags.includes(patch.removeTag)) {
      next.removedTags.push(patch.removeTag);
    }
  }
  if ('notes' in patch && typeof patch.notes === 'string') {
    next.notes = patch.notes;
  }
  if ('checklist' in patch && Array.isArray(patch.checklist)) {
    next.checklist = patch.checklist
      .filter((item) => item && typeof item.text === 'string')
      .map((item) => ({
        id: String(item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        text: item.text,
        done: Boolean(item.done),
        category: item.category || 'manual',
      }));
  }
  if ('discordSentAt' in patch) {
    next.discordSentAt =
      typeof patch.discordSentAt === 'string' ? patch.discordSentAt : null;
  }

  return next;
}

async function handleApi(req, res, urlObj) {
  const pathname = urlObj.pathname;

  // GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, time: new Date().toISOString() });
  }

  // GET /api/prs?refresh=true|false
  if (req.method === 'GET' && pathname === '/api/prs') {
    const forceRefresh = urlObj.searchParams.get('refresh') === 'true';
    const [userState, worktrees, cached] = await Promise.all([
      readUserState(),
      scanLocalWorktrees(forceRefresh),
      readPrCache(),
    ]);

    const cacheHasThreadNodes = (cached?.rawPrs || []).every(
      (p) => !(p.reviewThreads?.totalCount > 0) || Array.isArray(p.reviewThreads?.nodes)
    );
    const cacheHasCommentSyncMeta = (cached?.rawPrs || []).every((p) =>
      (p.comments?.nodes || []).every((c) => 'updatedAt' in c && 'body' in c)
    );
    const cacheFresh =
      cached &&
      cached.syncedAt &&
      cacheHasThreadNodes &&
      cacheHasCommentSyncMeta &&
      Date.now() - Date.parse(cached.syncedAt) < CACHE_TTL_MS;

    let activeCache = cached;
    if (forceRefresh || !cacheFresh) {
      const fresh = await fetchAllMyPRs();
      await writePrCache(fresh);
      activeCache = { ...fresh, fromCache: false };
    } else {
      activeCache = { ...cached, fromCache: true };
    }

    return sendJson(res, 200, buildPrPayload(activeCache, userState, worktrees));
  }

  // GET /api/prs/:owner/:repo/:number/details
  const detailMatch = pathname.match(/^\/api\/prs\/([^/]+)\/([^/]+)\/(\d+)\/details$/);
  if (req.method === 'GET' && detailMatch) {
    const [, owner, repo, num] = detailMatch;
    const details = await fetchPRDetails(
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      num
    );
    return sendJson(res, 200, details);
  }

  // POST /api/prs/:owner/:repo/:number/action
  const actionMatch = pathname.match(/^\/api\/prs\/([^/]+)\/([^/]+)\/(\d+)\/action$/);
  if (req.method === 'POST' && actionMatch) {
    const [, owner, repo, num] = actionMatch;
    const body = await readJsonBody(req);
    const result = await executeGhPrAction(
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      num,
      body.action,
      body.payload || {}
    );
    return sendJson(res, 200, result);
  }

  // POST /api/prs/:owner/:repo/:number/rebase (Rebase Local na Worktree)
  const rebaseMatch = pathname.match(/^\/api\/prs\/([^/]+)\/([^/]+)\/(\d+)\/rebase$/);
  if (req.method === 'POST' && rebaseMatch) {
    const [, owner, repo, numStr] = rebaseMatch;
    const num = Number.parseInt(numStr, 10);
    const decodedOwner = decodeURIComponent(owner);
    const decodedRepo = decodeURIComponent(repo);
    const body = await readJsonBody(req);
    const action = body.action || 'rebase'; // 'rebase' | 'abort' | 'push'

    const cache = await readPrCache();
    const rawPr = (cache.rawPrs || []).find(
      (p) =>
        p.number === num &&
        p.repository?.owner?.login?.toLowerCase() === decodedOwner.toLowerCase() &&
        p.repository?.name?.toLowerCase() === decodedRepo.toLowerCase()
    );

    const headRefName = body.headRefName || rawPr?.headRefName;
    const baseRefName = body.baseRefName || rawPr?.baseRefName || 'main';

    const worktrees = await scanLocalWorktrees(true);
    const dummyPr = {
      repo: `${decodedOwner}/${decodedRepo}`,
      repoName: decodedRepo,
      headRefName,
    };
    const matched = matchWorktreeForPr(dummyPr, worktrees);

    if (!matched || !matched.path) {
      return sendJson(res, 404, {
        ok: false,
        error: 'no_worktree',
        message: `Nenhuma worktree local encontrada para ${decodedOwner}/${decodedRepo} branch "${headRefName}".`,
      });
    }

    try {
      if (action === 'abort') {
        const resAbort = await abortLocalRebase(matched.path);
        return sendJson(res, 200, resAbort);
      }

      if (action === 'push') {
        const resPush = await pushLocalRebase(matched.path, headRefName);
        return sendJson(res, 200, resPush);
      }

      const resRebase = await executeLocalRebase(matched.path, baseRefName);
      return sendJson(res, 200, resRebase);
    } catch (err) {
      return sendJson(res, 500, {
        ok: false,
        error: 'git_error',
        message: err.message,
      });
    }
  }

  // PATCH /api/prs/:prKey/state
  const stateMatch = pathname.match(/^\/api\/prs\/(.+)\/state$/);
  if (req.method === 'PATCH' && stateMatch) {
    const prKey = decodeURIComponent(stateMatch[1]);
    const patch = await readJsonBody(req);

    const updatedState = await updateUserState((state) => {
      state.prs[prKey] = applyStatePatch(state.prs[prKey], patch);
      return state;
    });

    return sendJson(res, 200, { prKey, state: updatedState.prs[prKey] });
  }

  // POST /api/prs/batch
  if (req.method === 'POST' && pathname === '/api/prs/batch') {
    const body = await readJsonBody(req);
    const prKeys = Array.isArray(body.prKeys) ? body.prKeys : [];
    const patch = body.patch || {};

    if (!prKeys.length) {
      return sendJson(res, 400, { error: 'prKeys é obrigatório' });
    }

    const updatedState = await updateUserState((state) => {
      for (const key of prKeys) {
        if (typeof key === 'string') {
          state.prs[key] = applyStatePatch(state.prs[key], patch);
        }
      }
      return state;
    });

    return sendJson(res, 200, { updatedCount: prKeys.length, prs: updatedState.prs });
  }

  // GET /api/tags
  if (req.method === 'GET' && pathname === '/api/tags') {
    const state = await readUserState();
    return sendJson(res, 200, { customTags: state.customTags });
  }

  // POST /api/tags (criar ou atualizar tag)
  if (req.method === 'POST' && pathname === '/api/tags') {
    const body = await readJsonBody(req);
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const color = typeof body.color === 'string' ? body.color.trim() : 'indigo';
    if (!label) {
      return sendJson(res, 400, { error: 'label é obrigatório' });
    }

    const id =
      typeof body.id === 'string' && body.id.trim()
        ? body.id.trim()
        : label
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-|-$/g, '') || `tag-${Date.now()}`;

    const updatedState = await updateUserState((state) => {
      const idx = state.customTags.findIndex((t) => t.id === id);
      const tagObj = { id, label, color };
      if (idx >= 0) {
        state.customTags[idx] = tagObj;
      } else {
        state.customTags.push(tagObj);
      }
      return state;
    });

    return sendJson(res, 200, { customTags: updatedState.customTags });
  }

  // DELETE /api/tags/:id
  const deleteTagMatch = pathname.match(/^\/api\/tags\/([^/]+)$/);
  if (req.method === 'DELETE' && deleteTagMatch) {
    const tagId = decodeURIComponent(deleteTagMatch[1]);
    const updatedState = await updateUserState((state) => {
      state.customTags = state.customTags.filter((t) => t.id !== tagId);
      for (const prKey of Object.keys(state.prs)) {
        if (Array.isArray(state.prs[prKey].tags)) {
          state.prs[prKey].tags = state.prs[prKey].tags.filter((t) => t !== tagId);
        }
      }
      return state;
    });

    return sendJson(res, 200, { customTags: updatedState.customTags });
  }

  return sendJson(res, 404, { error: 'Rota API não encontrada' });
}

async function serveStatic(res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(DIST_DIR, `.${safePath}`);
  if (!resolved.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(resolved);
    if (stat.isFile()) {
      const ext = path.extname(resolved);
      const data = await fs.readFile(resolved);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      });
      res.end(data);
      return;
    }
  } catch {
    // Fallback para SPA index.html
  }

  try {
    const html = await fs.readFile(path.join(DIST_DIR, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Frontend not built yet. Run `npm run build`.');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (urlObj.pathname.startsWith('/api/')) {
      await handleApi(req, res, urlObj);
      return;
    }
    await serveStatic(res, urlObj.pathname);
  } catch (err) {
    console.error('[server error]', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: err?.message || 'Internal server error' });
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PR-Hub Craft running at http://localhost:${PORT}`);
});
