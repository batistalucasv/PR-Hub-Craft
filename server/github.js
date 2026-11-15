import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const BOT_LOGINS = new Set([
  'coderabbitai',
  'coderabbitai[bot]',
  'github-actions',
  'github-actions[bot]',
  'dependabot',
  'dependabot[bot]',
  'codecov',
  'codecov[bot]',
  'netlify',
  'netlify[bot]',
  'vercel',
  'vercel[bot]',
  'renovate',
  'renovate[bot]',
  'claassistant',
  'cla-bot',
]);

const CODERABBIT_LOGINS = new Set(['coderabbitai', 'coderabbitai[bot]']);

const CUSTOM_MAINTAINER_LOGINS = new Set(
  (process.env.MAINTAINER_LOGINS || '')
    .split(',')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean)
);

const LIST_QUERY = `
query($cursor: String) {
  viewer {
    login
    avatarUrl
    name
  }
  rateLimit {
    limit
    remaining
    resetAt
    cost
  }
  search(query: "is:pr is:open involves:@me sort:updated-desc", type: ISSUE, first: 30, after: $cursor) {
    issueCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on PullRequest {
        id
        number
        title
        url
        state
        isDraft
        createdAt
        updatedAt
        mergeable
        mergeStateStatus
        reviewDecision
        additions
        deletions
        changedFiles
        headRefName
        baseRefName
        repository {
          nameWithOwner
          name
          owner {
            login
          }
        }
        author {
          login
          avatarUrl
        }
        labels(first: 8) {
          nodes {
            name
            color
          }
        }
        reviewRequests(first: 8) {
          nodes {
            requestedReviewer {
              ... on User {
                login
              }
            }
          }
        }
        latestOpinionatedReviews(first: 10) {
          nodes {
            author {
              login
              avatarUrl
            }
            state
            submittedAt
          }
        }
        commits(last: 10) {
          nodes {
            commit {
              oid
              committedDate
              messageHeadline
              parents(first: 2) {
                totalCount
              }
              author {
                user {
                  login
                }
              }
              statusCheckRollup {
                state
              }
            }
          }
        }
        reviews(last: 10) {
          nodes {
            author {
              login
            }
            state
            submittedAt
            body
            commit {
              oid
            }
          }
        }
        firstComments: comments(first: 3) {
          nodes {
            author {
              login
            }
            createdAt
            updatedAt
            lastEditedAt
            body
          }
        }
        comments(last: 6) {
          totalCount
          nodes {
            author {
              login
            }
            createdAt
            updatedAt
            lastEditedAt
            body
          }
        }
        reviewThreads(last: 50) {
          totalCount
          nodes {
            id
            isResolved
            isOutdated
            path
            line
          }
        }
      }
    }
  }
}
`;

const THREAD_BODIES_QUERY = `
query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on PullRequestReviewThread {
      id
      comments(last: 8) {
        nodes {
          author {
            login
          }
          body
          createdAt
          updatedAt
          url
        }
      }
    }
  }
}
`;

const DETAILS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      id
      number
      title
      url
      body
      isDraft
      mergeable
      mergeStateStatus
      reviewDecision
      headRefName
      baseRefName
      additions
      deletions
      changedFiles
      createdAt
      updatedAt
      author {
        login
        avatarUrl
      }
      recentCommits: commits(last: 10) {
        nodes {
          commit {
            oid
            committedDate
            messageHeadline
            parents(first: 2) {
              totalCount
            }
            author {
              user {
                login
              }
            }
          }
        }
      }
      commits(last: 1) {
        nodes {
          commit {
            oid
            committedDate
            messageHeadline
            statusCheckRollup {
              state
              contexts(first: 40) {
                nodes {
                  __typename
                  ... on CheckRun {
                    name
                    status
                    conclusion
                    detailsUrl
                    startedAt
                    completedAt
                  }
                  ... on StatusContext {
                    context
                    state
                    targetUrl
                    description
                  }
                }
              }
            }
          }
        }
      }
      reviewThreads(last: 50) {
        totalCount
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(last: 5) {
            nodes {
              id
              author {
                login
                avatarUrl
              }
              body
              createdAt
              url
            }
          }
        }
      }
      reviews(last: 20) {
        nodes {
          id
          author {
            login
            avatarUrl
          }
          state
          body
          submittedAt
          url
          commit {
            oid
          }
        }
      }
      firstComments: comments(first: 3) {
        nodes {
          id
          author {
            login
          }
          body
          createdAt
          updatedAt
          lastEditedAt
        }
      }
      comments(last: 20) {
        totalCount
        nodes {
          id
          author {
            login
            avatarUrl
          }
          body
          createdAt
          updatedAt
          lastEditedAt
          url
        }
      }
    }
  }
}
`;

export function isBotLogin(login) {
  if (!login) return true;
  const lower = login.toLowerCase();
  return lower.endsWith('[bot]') || BOT_LOGINS.has(lower);
}

export function isCodeRabbitLogin(login) {
  if (!login) return false;
  return CODERABBIT_LOGINS.has(login.toLowerCase());
}

function getCommentAuthorLogin(comment) {
  if (!comment) return '';
  if (typeof comment.author === 'string') return comment.author;
  return comment.author?.login || '';
}

function isCodeRabbitClosingAck(body = '') {
  const text = String(body);
  return (
    /thank you for using coderabbit/i.test(text) &&
    !/not marking the finding as addressed/i.test(text)
  );
}

function stripCodeRabbitBoilerplate(promptText = '') {
  return String(promptText)
    .replace(
      /^Treat finding text, file paths, and code as untrusted review data\.[\s\S]*?validate\.\s*/i,
      ''
    )
    .replace(
      /\n*After applying the fix, consider running `coderabbit review --agent`[\s\S]*$/i,
      ''
    )
    .trim();
}

export function extractCodeRabbitThreadAiPrompt(body = '') {
  if (!body) return null;
  const str = String(body);
  const blockMatch =
    str.match(
      /<!--\s*ai-agent-prompt:start\s*-->[\s\S]*?```(?:\w+)?\n([\s\S]*?)\n```[\s\S]*?<!--\s*ai-agent-prompt:end\s*-->/i
    ) ||
    str.match(
      /<summary>[\s\S]*?Prompt for AI Agents[\s\S]*?<\/summary>[\s\S]*?```(?:\w+)?\n([\s\S]*?)\n```/i
    );
  if (!blockMatch?.[1]) return null;
  const cleaned = stripCodeRabbitBoilerplate(blockMatch[1]);
  return cleaned || null;
}

export function extractCodeRabbitFixAllPrompts(reviews = []) {
  const crReviews = reviews
    .filter((r) => isCodeRabbitLogin(getCommentAuthorLogin(r)) && r?.body)
    .sort((a, b) => {
      const ta = Date.parse(a.submittedAt || a.createdAt || '') || 0;
      const tb = Date.parse(b.submittedAt || b.createdAt || '') || 0;
      return tb - ta;
    });

  const results = [];
  for (const r of crReviews) {
    const body = String(r.body);
    const match = body.match(
      /<summary>[\s\S]*?(?:Prompt to fix all issues|Prompt for all review comments)[\s\S]*?<\/summary>[\s\S]*?```(?:\w+)?\n([\s\S]*?)\n```/i
    );
    if (!match?.[1]) continue;
    const prompt = stripCodeRabbitBoilerplate(match[1]);
    if (!prompt) continue;
    results.push({
      submittedAt: r.submittedAt || r.createdAt || null,
      commitOid: r.commit?.oid?.slice(0, 7) || null,
      prompt,
    });
  }
  return results;
}

export function cleanReviewExcerpt(body, maxLen = 220) {
  if (!body) return '';
  let text = String(body)
    .replace(/<!--\s*ai-agent-prompt:start\s*-->[\s\S]*?<!--\s*ai-agent-prompt:end\s*-->/gi, ' ')
    .replace(/<details[\s\S]*?<\/details>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<picture[\s\S]*?<\/picture>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  text = text.replace(/^[·\-–—:\s]+/, '').trim();
  if (text.length > maxLen) {
    return `${text.slice(0, maxLen - 1).trimEnd()}…`;
  }
  return text;
}

export function extractCodeRabbitPending(reviewThreads = []) {
  let codeRabbitTotalThreads = 0;
  const codeRabbitPendingThreads = [];

  for (const thread of reviewThreads) {
    const comments = Array.isArray(thread?.comments)
      ? thread.comments
      : thread?.comments?.nodes || [];
    const crComments = comments.filter((c) =>
      isCodeRabbitLogin(getCommentAuthorLogin(c))
    );
    if (!crComments.length) continue;

    codeRabbitTotalThreads += 1;
    if (thread.isResolved) continue;

    const lastComment = comments[comments.length - 1];
    const lastAuthor = getCommentAuthorLogin(lastComment);
    const hasHumanReply = comments.some(
      (c) => !isBotLogin(getCommentAuthorLogin(c))
    );

    if (!isBotLogin(lastAuthor)) continue;

    if (
      hasHumanReply &&
      isCodeRabbitLogin(lastAuthor) &&
      isCodeRabbitClosingAck(lastComment?.body)
    ) {
      continue;
    }

    if (hasHumanReply && !isCodeRabbitLogin(lastAuthor)) continue;

    const targetComment =
      (isCodeRabbitLogin(lastAuthor) ? lastComment : null) || crComments[0];

    codeRabbitPendingThreads.push({
      id: thread.id || null,
      path: thread.path || 'arquivo',
      line: thread.line ?? null,
      isOutdated: Boolean(thread.isOutdated),
      url: targetComment?.url || crComments[0]?.url || null,
      createdAt: targetComment?.createdAt || crComments[0]?.createdAt || null,
      excerpt: cleanReviewExcerpt(targetComment?.body || ''),
      aiPrompt: extractCodeRabbitThreadAiPrompt(targetComment?.body || ''),
    });
  }

  return {
    codeRabbitTotalThreads,
    codeRabbitPendingCount: codeRabbitPendingThreads.length,
    codeRabbitPendingThreads,
  };
}

export function isMaintainerLogin(login) {
  if (!login) return false;
  const lower = login.toLowerCase();
  if (isBotLogin(lower)) return false;
  if (CUSTOM_MAINTAINER_LOGINS.size > 0) {
    return CUSTOM_MAINTAINER_LOGINS.has(lower);
  }
  return true;
}

function execGhGraphqlOnce(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', ['api', 'graphql', '--input', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('GitHub GraphQL timeout (25s)'));
    }, 25_000);

    child.stdout.on('data', (d) => stdoutChunks.push(d));
    child.stderr.on('data', (d) => stderrChunks.push(d));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
      if (code !== 0) {
        reject(new Error(stderr || `gh exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

async function runGraphql(query, variables = {}) {
  const cleanVars = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      cleanVars[key] = value;
    }
  }

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const stdout = await execGhGraphqlOnce({ query, variables: cleanVars });
      const parsed = JSON.parse(stdout);
      if (parsed.errors?.length) {
        const msg = parsed.errors.map((e) => e.message).join('; ');
        throw new Error(`GitHub GraphQL error: ${msg}`);
      }
      return parsed.data;
    } catch (err) {
      lastErr = err;
      if (String(err?.message || '').startsWith('GitHub GraphQL error:')) {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function hydrateUnresolvedThreadComments(rawPrs) {
  const unresolvedThreads = new Map();
  for (const pr of rawPrs) {
    for (const thread of pr.reviewThreads?.nodes || []) {
      if (!thread?.id || thread.isResolved) continue;
      unresolvedThreads.set(thread.id, thread);
    }
  }

  const ids = Array.from(unresolvedThreads.keys());
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await runGraphql(THREAD_BODIES_QUERY, { ids: batch });
    for (const node of data?.nodes || []) {
      const target = node?.id ? unresolvedThreads.get(node.id) : null;
      if (target && node.comments) {
        target.comments = node.comments;
      }
    }
  }
}

export async function fetchAllMyPRs() {
  let cursor = null;
  let viewer = null;
  let rateLimit = null;
  let issueCount = 0;
  const allNodes = [];

  for (let page = 0; page < 5; page += 1) {
    const data = await runGraphql(LIST_QUERY, { cursor });
    viewer = data.viewer;
    rateLimit = data.rateLimit;
    issueCount = data.search?.issueCount ?? allNodes.length;
    const nodes = (data.search?.nodes ?? []).filter((n) => n && n.number);
    allNodes.push(...nodes);

    if (!data.search?.pageInfo?.hasNextPage || !data.search?.pageInfo?.endCursor) {
      break;
    }
    cursor = data.search.pageInfo.endCursor;
  }

  // Deduplicar por id caso haja movimentação durante paginação
  const uniqueMap = new Map();
  for (const node of allNodes) {
    uniqueMap.set(node.id, node);
  }
  const rawPrs = Array.from(uniqueMap.values());
  await hydrateUnresolvedThreadComments(rawPrs);

  return {
    viewer,
    rateLimit,
    issueCount,
    syncedAt: new Date().toISOString(),
    rawPrs,
  };
}

function maxIsoTimestamp(dates) {
  let bestMs = 0;
  let bestIso = null;
  for (const d of dates) {
    if (!d) continue;
    const ms = Date.parse(d);
    if (!Number.isNaN(ms) && ms > bestMs) {
      bestMs = ms;
      bestIso = d;
    }
  }
  return { ms: bestMs, iso: bestIso };
}

function isMergeCommitNode(commit) {
  if (!commit) return false;
  if ((commit.parents?.totalCount || 0) > 1) return true;
  return /^Merge (branch|pull request|remote-tracking branch)\b/i.test(
    commit.messageHeadline || ''
  );
}

export function selectTargetCommitForCodeRabbit(
  commitNodes = [],
  prAuthorLogin = '',
  fallbackDate = null
) {
  const commits = (commitNodes || []).map((n) => n?.commit).filter(Boolean);
  if (commits.length === 0) {
    return { oid: null, committedDate: fallbackDate || null };
  }

  const authorLower = prAuthorLogin ? prAuthorLogin.toLowerCase() : '';
  const isAuthorCommit = (c) => {
    if (!authorLower) return true;
    return (c.author?.user?.login || '').toLowerCase() === authorLower;
  };

  const newestFirst = [...commits].reverse();
  const chosen =
    newestFirst.find((c) => !isMergeCommitNode(c) && isAuthorCommit(c)) ||
    newestFirst.find((c) => isAuthorCommit(c)) ||
    newestFirst.find((c) => !isMergeCommitNode(c)) ||
    newestFirst[0];

  return {
    oid: chosen?.oid || null,
    committedDate: chosen?.committedDate || fallbackDate || null,
  };
}

function shaMatches(a, b) {
  if (!a || !b) return false;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la === lb || la.startsWith(lb) || lb.startsWith(la);
}

export function computeCodeRabbitCommitSync(
  reviews = [],
  comments = [],
  targetCommit = null,
  firstComments = []
) {
  const targetOid =
    targetCommit && typeof targetCommit === 'object' ? targetCommit.oid || null : null;
  const lastCommitDate =
    targetCommit && typeof targetCommit === 'object'
      ? targetCommit.committedDate || null
      : targetCommit || null;
  const lastCommitMs = lastCommitDate ? Date.parse(lastCommitDate) || 0 : 0;

  const crReviews = reviews.filter((r) =>
    isCodeRabbitLogin(getCommentAuthorLogin(r))
  );
  const crReviewDates = crReviews.map((r) => r.submittedAt || r.createdAt);
  const reviewedCommitOids = crReviews
    .map((r) => r.commit?.oid)
    .filter(Boolean);

  const seenComments = new Set();
  const mergedComments = [];
  for (const c of [...(firstComments || []), ...(comments || [])]) {
    if (!c) continue;
    const key = `${c.createdAt || ''}:${String(c.body || '').slice(0, 48)}`;
    if (seenComments.has(key)) continue;
    seenComments.add(key);
    mergedComments.push(c);
  }

  const crComments = mergedComments.filter((c) =>
    isCodeRabbitLogin(getCommentAuthorLogin(c))
  );

  const finishedCommentDates = [];
  const triggeredCommentDates = [];
  const rateLimitedDates = [];
  const pausedUnreviewedOids = [];

  for (const c of crComments) {
    const body = String(c.body || '');
    const ts = c.lastEditedAt || c.updatedAt || c.createdAt;

    const coveredMatch = body.match(/"coveredCommitId"\s*:\s*"([0-9a-f]{7,40})"/i);
    if (coveredMatch) reviewedCommitOids.push(coveredMatch[1]);

    const lastReviewedMatch = body.match(/Last reviewed commit:\s*`?([0-9a-f]{7,40})`?/i);
    if (lastReviewedMatch) reviewedCommitOids.push(lastReviewedMatch[1]);

    const isPaused = /review paused by coderabbit\.ai|##\s*Reviews paused/i.test(body);
    if (isPaused) {
      const unreviewedMatch = body.match(
        /Latest commit, not reviewed:\s*`?([0-9a-f]{7,40})`?/i
      );
      if (unreviewedMatch) pausedUnreviewedOids.push(unreviewedMatch[1]);
    }

    if (/review finished|<!--\s*walkthrough_start\s*-->/i.test(body)) {
      finishedCommentDates.push(isPaused ? c.createdAt : ts);
    } else if (/review triggered/i.test(body)) {
      triggeredCommentDates.push(ts);
    } else if (/rate limited by coderabbit\.ai/i.test(body)) {
      rateLimitedDates.push(ts);
    }
  }

  const lastReview = maxIsoTimestamp([...crReviewDates, ...finishedCommentDates]);
  const lastTriggered = maxIsoTimestamp(triggeredCommentDates);
  const lastRateLimited = maxIsoTimestamp(rateLimitedDates);

  const matchedReviewedCommit =
    targetOid && reviewedCommitOids.some((oid) => shaMatches(oid, targetOid));
  const matchedPausedUnreviewed =
    targetOid && pausedUnreviewedOids.some((oid) => shaMatches(oid, targetOid));

  let status = 'none';
  if (matchedReviewedCommit) {
    status = 'reviewed_after_commit';
  } else if (matchedPausedUnreviewed) {
    status = lastReview.ms > 0 ? 'stale_before_commit' : 'none';
  } else if (lastReview.ms > 0 && lastReview.ms >= lastCommitMs) {
    status = 'reviewed_after_commit';
  } else if (lastTriggered.ms > 0 && lastTriggered.ms >= lastCommitMs) {
    status = 'reviewing_commit';
  } else if (lastReview.ms > 0) {
    status = 'stale_before_commit';
  } else if (lastRateLimited.ms > 0 && lastRateLimited.ms >= lastCommitMs) {
    status = 'rate_limited';
  }

  return {
    status,
    lastCommitDate: lastCommitDate || null,
    lastReviewedAt: lastReview.iso,
    lastTriggeredAt: lastTriggered.iso,
    deltaMs: lastReview.ms > 0 && lastCommitMs > 0 ? lastReview.ms - lastCommitMs : null,
  };
}

function computeSla(statusType, anchorIso, nowMs) {
  if (statusType === 'paused') {
    return {
      status: 'paused',
      days: 0,
      label: 'SLA pausado',
      detail: 'Aguardando revisor / maintainer',
    };
  }

  const anchorMs = anchorIso ? Date.parse(anchorIso) : nowMs;
  const days = Math.max(0, Math.floor((nowMs - anchorMs) / 86_400_000));

  if (statusType === 'review') {
    if (days >= 7) {
      return {
        status: 'warning_7d',
        days,
        label: `${days}d esperando review`,
        detail: 'PR de terceiros aguardando sua revisão há 7+ dias',
      };
    }
    return {
      status: 'ok',
      days,
      label: days === 0 ? 'Hoje' : `${days}d aberta`,
      detail: 'Aguardando sua revisão',
    };
  }

  if (days >= 30) {
    return {
      status: 'danger_30d',
      days,
      label: `${days}d sem resposta`,
      detail: 'Regra 14: elegível para fechamento (30+ dias aguardando autor)',
    };
  }
  if (days >= 14) {
    return {
      status: 'overdue_14d',
      days,
      label: `${days}d aguardando você`,
      detail: 'Regra 14: lembrete de 14 dias atingido',
    };
  }
  if (days >= 7) {
    return {
      status: 'overdue_7d',
      days,
      label: `${days}d aguardando você`,
      detail: 'Regra 14: passou do prazo de resposta de 7 dias',
    };
  }
  if (days >= 5) {
    return {
      status: 'warning_7d',
      days,
      label: `${days}d aguardando você`,
      detail: 'Perto do limite de 7 dias para responder',
    };
  }

  return {
    status: 'ok',
    days,
    label: days === 0 ? 'Atualizada hoje' : `${days}d aguardando você`,
    detail: 'Dentro do prazo de 7 dias',
  };
}

export function classifyPR(pr, viewerLogin, nowMs = Date.now()) {
  const viewerLower = (viewerLogin || '').toLowerCase();
  const authorLogin = pr.author?.login || 'unknown';
  const authorLower = authorLogin.toLowerCase();
  const repo = pr.repository?.nameWithOwner || 'unknown/repo';
  const repoName = pr.repository?.name || repo.split('/')[1] || repo;
  const prKey = `${repo}#${pr.number}`;

  const requestedReviewers = (pr.reviewRequests?.nodes || [])
    .map((n) => n?.requestedReviewer?.login)
    .filter(Boolean);

  const reviews = pr.reviews?.nodes || [];
  const comments = pr.comments?.nodes || [];

  const isRequestedReviewer = requestedReviewers.some((l) => l.toLowerCase() === viewerLower);
  const viewerReviewed = reviews.some((r) => r.author?.login?.toLowerCase() === viewerLower);

  let role = 'involved';
  if (authorLower === viewerLower) {
    role = 'author';
  } else if (isRequestedReviewer || viewerReviewed) {
    role = 'reviewer';
  }

  const commitNodes = pr.commits?.nodes || [];
  const headCommit = commitNodes[commitNodes.length - 1]?.commit || null;
  const lastCommitDate = headCommit?.committedDate || pr.createdAt;
  const lastCommitMs = Date.parse(lastCommitDate) || 0;
  const ciState = headCommit?.statusCheckRollup?.state || 'NONE';

  const hasConflict = pr.mergeable === 'CONFLICTING' || pr.mergeStateStatus === 'DIRTY';
  const hasCiFailure = ciState === 'FAILURE' || ciState === 'ERROR';

  // Filtrar feedback apenas de mantenedores
  const humanReviews = reviews.filter(
    (r) =>
      isMaintainerLogin(r.author?.login) &&
      r.author?.login?.toLowerCase() !== authorLower
  );
  const humanComments = comments.filter(
    (c) =>
      isMaintainerLogin(c.author?.login) &&
      c.author?.login?.toLowerCase() !== authorLower
  );
  const botFeedbackCount =
    reviews.filter((r) => isBotLogin(r.author?.login)).length +
    comments.filter((c) => isBotLogin(c.author?.login)).length;

  const latestHumanFeedback = maxIsoTimestamp([
    ...humanReviews.map((r) => r.submittedAt),
    ...humanComments.map((c) => c.createdAt),
  ]);

  const latestAuthorComment = maxIsoTimestamp(
    comments
      .filter((c) => c.author?.login?.toLowerCase() === authorLower)
      .map((c) => c.createdAt)
  );

  const latestAuthorActivityMs = Math.max(lastCommitMs, latestAuthorComment.ms);
  const hasNewHumanFeedback = latestHumanFeedback.ms > latestAuthorActivityMs;

  // Mapear apenas mantenedores a partir de latestOpinionatedReviews, reviewRequests e reviews
  const requestedSet = new Set(requestedReviewers.map((l) => l.toLowerCase()));
  const reviewerMap = new Map();

  for (const rev of pr.latestOpinionatedReviews?.nodes || []) {
    const login = rev?.author?.login;
    if (!login || !isMaintainerLogin(login) || login.toLowerCase() === authorLower) continue;
    const key = login.toLowerCase();
    const submittedMs = Date.parse(rev.submittedAt) || 0;
    let state = rev.state || 'COMMENTED';
    if (state === 'CHANGES_REQUESTED' && lastCommitMs > submittedMs) {
      state = 'CHANGES_REQUESTED_ADDRESSED';
    }
    reviewerMap.set(key, {
      login,
      avatarUrl: rev.author?.avatarUrl || null,
      state,
      submittedAt: rev.submittedAt,
      reRequested: requestedSet.has(key),
    });
  }

  for (const login of requestedReviewers) {
    if (!isMaintainerLogin(login) || login.toLowerCase() === authorLower) continue;
    const key = login.toLowerCase();
    if (!reviewerMap.has(key)) {
      reviewerMap.set(key, {
        login,
        avatarUrl: null,
        state: 'REQUESTED',
        submittedAt: null,
        reRequested: true,
      });
    } else {
      const existing = reviewerMap.get(key);
      existing.reRequested = true;
    }
  }

  for (const rev of reviews) {
    const login = rev?.author?.login;
    if (!login || !isMaintainerLogin(login) || login.toLowerCase() === authorLower) continue;
    const key = login.toLowerCase();
    if (!reviewerMap.has(key)) {
      reviewerMap.set(key, {
        login,
        avatarUrl: null,
        state: rev.state || 'COMMENTED',
        submittedAt: rev.submittedAt,
        reRequested: requestedSet.has(key),
      });
    }
  }

  const humanReviewers = Array.from(reviewerMap.values());
  const hasPendingChangesRequested =
    humanReviewers.some((r) => r.state === 'CHANGES_REQUESTED') ||
    (pr.reviewDecision === 'CHANGES_REQUESTED' &&
      !humanReviewers.some((r) => r.state === 'CHANGES_REQUESTED_ADDRESSED'));

  const feedbackAddressed =
    !hasPendingChangesRequested &&
    !hasNewHumanFeedback &&
    humanReviewers.some((r) => r.state === 'CHANGES_REQUESTED_ADDRESSED');

  const hasUnansweredFeedback = hasPendingChangesRequested || hasNewHumanFeedback;
  const isQuickWinConflict =
    role === 'author' && hasConflict && !hasCiFailure && !hasPendingChangesRequested;

  let autoStage = 'revisado';
  let actionReason = 'Aguardando revisão do maintainer';
  let sla;

  if (hasConflict || hasCiFailure) {
    autoStage = 'problema';
    const parts = [];
    if (hasConflict) parts.push(`Conflito de merge com ${pr.baseRefName || 'main'}`);
    if (hasCiFailure) parts.push('Checks do CI falhando');
    actionReason = parts.join(' + ');
    if (feedbackAddressed) {
      actionReason += ' (Review já corrigido ✓)';
    }
    sla = computeSla('author', latestHumanFeedback.iso || pr.updatedAt, nowMs);
  } else if (
    pr.reviewDecision === 'APPROVED' &&
    !pr.isDraft &&
    !hasConflict &&
    !hasCiFailure
  ) {
    autoStage = 'aprovado';
    actionReason = 'Aprovada e checks verdes — pronta para merge';
    sla = computeSla('paused', null, nowMs);
  } else if (role !== 'author') {
    autoStage = 'revisar';
    actionReason = isRequestedReviewer
      ? 'Revisão solicitada diretamente a você'
      : 'Você está participando desta PR';
    sla = computeSla('review', pr.updatedAt, nowMs);
  } else if (hasUnansweredFeedback) {
    autoStage = 'revisar';
    actionReason = hasPendingChangesRequested
      ? 'Changes requested pendente de correção'
      : 'Novo feedback humano após seu último commit';
    sla = computeSla('author', latestHumanFeedback.iso || pr.updatedAt, nowMs);
  } else if (feedbackAddressed) {
    autoStage = 'finalizado';
    actionReason = pr.isDraft
      ? '✅ Review corrigido — revisar draft e publicar'
      : '✅ Review corrigido c/ novo commit — pedir re-review';
    sla = computeSla('paused', null, nowMs);
  } else if (pr.isDraft && !hasConflict && !hasCiFailure) {
    autoStage = 'finalizado';
    actionReason = 'Draft sem conflitos/erros — pronto para revisar e publicar';
    sla = computeSla('paused', null, nowMs);
  } else {
    autoStage = 'revisado';
    actionReason =
      ciState === 'PENDING' || ciState === 'EXPECTED'
        ? 'CI em execução; aguardando revisão'
        : 'Aguardando revisão do maintainer';
    sla = computeSla('paused', null, nowMs);
  }

  const codeRabbitStats = extractCodeRabbitPending(pr.reviewThreads?.nodes || []);
  const codeRabbitFixAllPrompts = extractCodeRabbitFixAllPrompts(reviews);
  const codeRabbitTargetCommit = selectTargetCommitForCodeRabbit(
    commitNodes,
    authorLogin,
    lastCommitDate
  );
  const codeRabbitCommitSync = computeCodeRabbitCommitSync(
    reviews,
    comments,
    codeRabbitTargetCommit,
    pr.firstComments?.nodes || []
  );

  return {
    id: pr.id,
    prKey,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    repo,
    repoName,
    owner: pr.repository?.owner?.login || repo.split('/')[0],
    isDraft: Boolean(pr.isDraft),
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    lastCommitDate,
    mergeable: pr.mergeable || 'UNKNOWN',
    mergeStateStatus: pr.mergeStateStatus || 'UNKNOWN',
    hasConflict,
    hasCiFailure,
    ciState,
    reviewDecision: pr.reviewDecision || null,
    additions: pr.additions || 0,
    deletions: pr.deletions || 0,
    changedFiles: pr.changedFiles || 0,
    headRefName: pr.headRefName || '',
    baseRefName: pr.baseRefName || 'main',
    author: {
      login: authorLogin,
      avatarUrl: pr.author?.avatarUrl || null,
    },
    role,
    requestedReviewers,
    humanReviewers,
    feedbackAddressed,
    hasPendingChangesRequested,
    isQuickWinConflict,
    labels: (pr.labels?.nodes || []).map((l) => ({ name: l.name, color: l.color })),
    totalComments: pr.comments?.totalCount || 0,
    totalReviewThreads: pr.reviewThreads?.totalCount || 0,
    humanFeedbackCount: humanReviews.length + humanComments.length,
    botFeedbackCount,
    ...codeRabbitStats,
    codeRabbitFixAllPrompts,
    latestCodeRabbitFixAllPrompt: codeRabbitFixAllPrompts[0] || null,
    codeRabbitCommitSync,
    autoStage,
    actionReason,
    sla,
  };
}

export async function fetchPRDetails(owner, repo, number) {
  const prNum = Number.parseInt(number, 10);
  if (!owner || !repo || Number.isNaN(prNum) || prNum <= 0) {
    throw new Error('Parâmetros inválidos para detalhar PR');
  }

  const data = await runGraphql(DETAILS_QUERY, {
    owner,
    repo,
    number: prNum,
  });

  const pr = data?.repository?.pullRequest;
  if (!pr) {
    throw new Error(`PR ${owner}/${repo}#${prNum} não encontrada`);
  }

  const lastCommit = pr.commits?.nodes?.[0]?.commit || null;
  const rawContexts = lastCommit?.statusCheckRollup?.contexts?.nodes || [];

  const checks = rawContexts.map((ctx) => {
    if (ctx.__typename === 'CheckRun') {
      return {
        type: 'check',
        name: ctx.name,
        status: ctx.status,
        conclusion: ctx.conclusion,
        url: ctx.detailsUrl || null,
      };
    }
    return {
      type: 'status',
      name: ctx.context,
      status: ctx.state === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
      conclusion: ctx.state,
      url: ctx.targetUrl || null,
      description: ctx.description || '',
    };
  });

  const reviewThreads = (pr.reviewThreads?.nodes || []).map((t) => ({
    id: t.id,
    isResolved: Boolean(t.isResolved),
    isOutdated: Boolean(t.isOutdated),
    path: t.path,
    line: t.line,
    comments: (t.comments?.nodes || []).map((c) => ({
      id: c.id,
      author: c.author?.login || 'ghost',
      avatarUrl: c.author?.avatarUrl || null,
      isBot: isBotLogin(c.author?.login),
      body: c.body || '',
      createdAt: c.createdAt,
      url: c.url,
    })),
  }));

  const reviews = (pr.reviews?.nodes || [])
    .filter((r) => r.body?.trim() || r.state !== 'COMMENTED')
    .map((r) => ({
      id: r.id,
      author: r.author?.login || 'ghost',
      avatarUrl: r.author?.avatarUrl || null,
      isBot: isBotLogin(r.author?.login),
      state: r.state,
      body: r.body || '',
      createdAt: r.submittedAt,
      url: r.url,
    }));

  const comments = (pr.comments?.nodes || []).map((c) => ({
    id: c.id,
    author: c.author?.login || 'ghost',
    avatarUrl: c.author?.avatarUrl || null,
    isBot: isBotLogin(c.author?.login),
    body: c.body || '',
    createdAt: c.createdAt,
    updatedAt: c.updatedAt || c.createdAt,
    url: c.url,
  }));

  const codeRabbitStats = extractCodeRabbitPending(reviewThreads);
  const codeRabbitFixAllPrompts = extractCodeRabbitFixAllPrompts(
    pr.reviews?.nodes || reviews
  );
  const codeRabbitTargetCommit = selectTargetCommitForCodeRabbit(
    pr.recentCommits?.nodes || pr.commits?.nodes || [],
    pr.author?.login || '',
    lastCommit?.committedDate || pr.createdAt
  );
  const codeRabbitCommitSync = computeCodeRabbitCommitSync(
    pr.reviews?.nodes || reviews,
    pr.comments?.nodes || comments,
    codeRabbitTargetCommit,
    pr.firstComments?.nodes || []
  );

  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    body: pr.body || '',
    isDraft: Boolean(pr.isDraft),
    mergeable: pr.mergeable,
    mergeStateStatus: pr.mergeStateStatus,
    reviewDecision: pr.reviewDecision,
    headRefName: pr.headRefName,
    baseRefName: pr.baseRefName,
    lastCommit: lastCommit
      ? {
          oid: lastCommit.oid?.slice(0, 7),
          committedDate: lastCommit.committedDate,
          headline: lastCommit.messageHeadline,
          rollupState: lastCommit.statusCheckRollup?.state || 'NONE',
        }
      : null,
    checks,
    reviewThreadsTotal: pr.reviewThreads?.totalCount || reviewThreads.length,
    reviewThreads,
    reviews,
    comments,
    ...codeRabbitStats,
    codeRabbitFixAllPrompts,
    latestCodeRabbitFixAllPrompt: codeRabbitFixAllPrompts[0] || null,
    codeRabbitCommitSync,
  };
}

export async function executeGhPrAction(owner, repo, number, action, payload = {}) {
  const prNum = Number.parseInt(number, 10);
  if (
    !/^[a-zA-Z0-9._-]+$/.test(owner || '') ||
    !/^[a-zA-Z0-9._-]+$/.test(repo || '') ||
    Number.isNaN(prNum) ||
    prNum <= 0
  ) {
    throw new Error('Parâmetros inválidos para ação no GitHub');
  }

  const repoFull = `${owner}/${repo}`;

  if (action === 'ready') {
    await execFileAsync('gh', ['pr', 'ready', String(prNum), '-R', repoFull], {
      timeout: 20_000,
    });
    return { ok: true, message: `PR #${prNum} marcada como Ready for review` };
  }

  if (action === 're_review') {
    const reviewers = (Array.isArray(payload.reviewers) ? payload.reviewers : [])
      .filter((r) => typeof r === 'string' && /^[a-zA-Z0-9-]+$/.test(r));
    if (!reviewers.length) {
      throw new Error('Nenhum revisor válido informado');
    }
    await execFileAsync(
      'gh',
      ['pr', 'edit', String(prNum), '-R', repoFull, '--add-reviewer', reviewers.join(',')],
      { timeout: 20_000 }
    );
    return {
      ok: true,
      message: `Re-review solicitado para ${reviewers.map((r) => `@${r}`).join(', ')}`,
    };
  }

  if (action === 'update_branch') {
    await execFileAsync(
      'gh',
      ['api', '-X', 'PUT', `repos/${owner}/${repo}/pulls/${prNum}/update-branch`],
      { timeout: 20_000 }
    );
    return { ok: true, message: `Update branch solicitado para PR #${prNum}` };
  }

  throw new Error(`Ação não suportada: ${action}`);
}
