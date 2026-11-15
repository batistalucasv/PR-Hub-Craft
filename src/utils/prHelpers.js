import { localizeBackendText } from '../i18n.jsx';

export const THEMES = [
  { id: 'graphite', label: 'Grafite Neutro', labelEn: 'Neutral Graphite', mode: 'dark', swatch: '#3b82f6', bg: '#161b22' },
  { id: 'light', label: 'Claro Moderno', labelEn: 'Modern Light', mode: 'light', swatch: '#2563eb', bg: '#f8fafc' },
  { id: 'pastel-sage', label: 'Pastel Sálvia', labelEn: 'Pastel Sage', mode: 'light', swatch: '#2b8a6e', bg: '#e6f2ec' },
  { id: 'pastel-rose', label: 'Pastel Lavanda', labelEn: 'Pastel Lavender', mode: 'light', swatch: '#b84a7c', bg: '#f7e8f0' },
  { id: 'ocean', label: 'Oceano / Azul', labelEn: 'Ocean Blue', mode: 'dark', swatch: '#0ea5e9', bg: '#0f172a' },
  { id: 'emerald', label: 'Esmeralda', labelEn: 'Emerald', mode: 'dark', swatch: '#10b981', bg: '#0d1f18' },
  { id: 'soft', label: 'Escuro Suave', labelEn: 'Soft Dark', mode: 'dark', swatch: '#8b5cf6', bg: '#1e1e2e' },
];

export function getThemes(lang = 'pt') {
  return THEMES.map((t) => ({ ...t, label: lang === 'en' ? t.labelEn : t.label }));
}

export const STAGES = [
  {
    id: 'problema',
    label: 'Problema',
    labelEn: 'Issues',
    shortLabel: 'Problema',
    shortLabelEn: 'Issues',
    description: 'Suas PRs com conflito de merge, CI falhando ou bloqueios',
    descriptionEn: 'Your PRs with merge conflicts, failing CI or blockers',
    accent: 'text-rose-300',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    dot: 'bg-rose-400',
  },
  {
    id: 'revisar',
    label: 'Revisar',
    labelEn: 'To Review',
    shortLabel: 'Revisar',
    shortLabelEn: 'Review',
    description: 'PRs para revisar ou feedback pendente de resolução',
    descriptionEn: 'PRs to review or pending feedback to address',
    accent: 'text-sky-300',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    dot: 'bg-sky-400',
  },
  {
    id: 'finalizado',
    label: 'Finalizado',
    labelEn: 'Finalized',
    shortLabel: 'Finalizado',
    shortLabelEn: 'Finalized',
    description: 'Feedback corrigido, draft pronto para publicar ou re-review',
    descriptionEn: 'Addressed feedback or drafts ready for re-review',
    accent: 'text-amber-300',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-400',
  },
  {
    id: 'revisado',
    label: 'Revisado',
    labelEn: 'Reviewed',
    shortLabel: 'Revisado',
    shortLabelEn: 'Reviewed',
    description: 'PRs já revisadas ou aguardando resposta dos mantenedores',
    descriptionEn: 'Reviewed PRs or waiting for maintainer response',
    accent: 'text-violet-300',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    dot: 'bg-violet-400',
  },
  {
    id: 'aprovado',
    label: 'Aprovado',
    labelEn: 'Approved',
    shortLabel: 'Aprovado',
    shortLabelEn: 'Approved',
    description: 'PRs aprovadas e com checks verdes, prontas para merge',
    descriptionEn: 'Approved PRs with green checks, ready to merge',
    accent: 'text-emerald-300',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
  },
];

export function normalizeStage(stage) {
  if (!stage) return stage;
  if (stage === 'corrigir_conflito_ci') return 'problema';
  if (stage === 'resolver_feedback') return 'revisar';
  if (stage === 'finalizar') return 'finalizado';
  if (stage === 'aguardando') return 'revisado';
  return stage;
}

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s]));
// Retrocompatibilidade para estágios anteriores salvos no cache/localStorage
STAGE_MAP.corrigir_conflito_ci = STAGE_MAP.problema;
STAGE_MAP.resolver_feedback = STAGE_MAP.revisar;
STAGE_MAP.finalizar = STAGE_MAP.finalizado;
STAGE_MAP.aguardando = STAGE_MAP.revisado;

export const ARCHIVED_STAGE = {
  id: 'arquivado',
  label: 'Adiada / Arquivada',
  labelEn: 'Deferred / Archived',
  shortLabel: 'Adiada',
  shortLabelEn: 'Deferred',
  description: 'PRs ocultadas temporariamente da fila principal',
  descriptionEn: 'PRs temporarily hidden from the main queue',
  accent: 'text-zinc-400',
  border: 'border-zinc-500/30',
  bg: 'bg-zinc-500/10',
  dot: 'bg-zinc-400',
};

function localizeStage(stage, lang = 'pt') {
  if (!stage) return stage;
  if (lang !== 'en') return stage;
  return {
    ...stage,
    label: stage.labelEn,
    shortLabel: stage.shortLabelEn,
    description: stage.descriptionEn,
  };
}

export function getStages(lang = 'pt') {
  return STAGES.map((s) => localizeStage(s, lang));
}

export function getArchivedStage(lang = 'pt') {
  return localizeStage(ARCHIVED_STAGE, lang);
}

export function getStageMeta(stageId, lang = 'pt') {
  const normalized = normalizeStage(stageId);
  const base = STAGE_MAP[normalized] || (normalized === 'arquivado' ? ARCHIVED_STAGE : STAGE_MAP.revisado || STAGES[0]);
  return localizeStage(base, lang);
}

export const PRIORITIES = [
  {
    id: 'P0',
    label: 'P0 · Crítica',
    labelEn: 'P0 · Critical',
    short: 'P0',
    weight: 0,
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dotClass: 'bg-rose-400',
  },
  {
    id: 'P1',
    label: 'P1 · Alta',
    labelEn: 'P1 · High',
    short: 'P1',
    weight: 1,
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotClass: 'bg-amber-400',
  },
  {
    id: 'P2',
    label: 'P2 · Média',
    labelEn: 'P2 · Medium',
    short: 'P2',
    weight: 2,
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    dotClass: 'bg-sky-400',
  },
  {
    id: 'P3',
    label: 'P3 · Baixa',
    labelEn: 'P3 · Low',
    short: 'P3',
    weight: 3,
    badgeClass: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    dotClass: 'bg-zinc-400',
  },
];

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]));

export function getPriorities(lang = 'pt') {
  return PRIORITIES.map((p) => ({ ...p, label: lang === 'en' ? p.labelEn : p.label }));
}

export const WORK_STATUSES = [
  {
    id: 'executando',
    label: 'Executando',
    labelEn: 'Running',
    short: 'Executando',
    shortEn: 'Running',
    icon: '▶',
    cardClass: 'pr-card-work-executando',
    badgeClass: 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200',
    dotClass: 'bg-cyan-400 animate-pulse',
  },
  {
    id: 'parado',
    label: 'Parado',
    labelEn: 'Paused',
    short: 'Parado',
    shortEn: 'Paused',
    icon: '⏸',
    cardClass: 'pr-card-work-parado',
    badgeClass: 'border-amber-400/55 bg-amber-500/20 text-amber-200',
    dotClass: 'bg-amber-400',
  },
  {
    id: 'terminado',
    label: 'Terminado',
    labelEn: 'Done',
    short: 'Terminado',
    shortEn: 'Done',
    icon: '✓',
    cardClass: 'pr-card-work-terminado',
    badgeClass: 'border-emerald-400/55 bg-emerald-500/20 text-emerald-200',
    dotClass: 'bg-emerald-400',
  },
];

export const WORK_STATUS_MAP = Object.fromEntries(
  WORK_STATUSES.map((s) => [s.id, s])
);

export function getWorkStatuses(lang = 'pt') {
  return WORK_STATUSES.map((s) => ({
    ...s,
    label: lang === 'en' ? s.labelEn : s.label,
    short: lang === 'en' ? s.shortEn : s.short,
  }));
}

export function getWorkStatusMeta(workStatus, lang = 'pt') {
  const base = WORK_STATUS_MAP[workStatus];
  if (!base) return null;
  return lang === 'en' ? { ...base, label: base.labelEn, short: base.shortEn } : base;
}

export const TAG_COLORS = {
  rose: {
    name: 'Rosa / Urgente',
    nameEn: 'Rose / Urgent',
    pill: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400',
  },
  amber: {
    name: 'Âmbar / Atenção',
    nameEn: 'Amber / Attention',
    pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  violet: {
    name: 'Violeta / IA',
    nameEn: 'Violet / AI',
    pill: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    dot: 'bg-violet-400',
  },
  cyan: {
    name: 'Ciano / Teste',
    nameEn: 'Cyan / Test',
    pill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-400',
  },
  blue: {
    name: 'Azul / Docs',
    nameEn: 'Blue / Docs',
    pill: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  emerald: {
    name: 'Esmeralda / Pronto',
    nameEn: 'Emerald / Ready',
    pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  indigo: {
    name: 'Índigo',
    nameEn: 'Indigo',
    pill: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400',
  },
  zinc: {
    name: 'Neutro',
    nameEn: 'Neutral',
    pill: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    dot: 'bg-zinc-400',
  },
};

export function getTagStyle(color) {
  return TAG_COLORS[color] || TAG_COLORS.indigo;
}

export function formatRelativeTime(isoString, lang = 'pt') {
  if (!isoString) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - Date.parse(isoString)) / 1000));
  if (lang === 'en') {
    if (diffSec < 60) return 'just now';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
  if (diffSec < 60) return 'agora';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `há ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months}me`;
}

export function formatDeltaDuration(deltaMs) {
  if (typeof deltaMs !== 'number' || Number.isNaN(deltaMs)) return '';
  const absSec = Math.max(0, Math.floor(Math.abs(deltaMs) / 1000));
  if (absSec < 60) return `${absSec}s`;
  const mins = Math.floor(absSec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function getCodeRabbitSyncMeta(sync, pendingCount = 0, lang = 'pt') {
  if (!sync || !sync.status || sync.status === 'none') return null;

  const commitAgo = formatRelativeTime(sync.lastCommitDate, lang);
  const reviewAgo = formatRelativeTime(sync.lastReviewedAt, lang);
  const deltaText = formatDeltaDuration(sync.deltaMs);
  const en = lang === 'en';

  switch (sync.status) {
    case 'reviewed_after_commit':
      return {
        status: sync.status,
        short: pendingCount > 0 ? (en ? 'CR post-commit' : 'CR pós-commit') : (en ? '✓ CR post-commit' : '✓ CR pós-commit'),
        label:
          pendingCount > 0
            ? en
              ? `CodeRabbit reviewed after latest commit (${deltaText ? `+${deltaText}` : 'recent'})`
              : `CodeRabbit revisou após o último commit (${deltaText ? `+${deltaText}` : 'recente'})`
            : en
              ? `Latest commit reviewed by CodeRabbit (${deltaText ? `+${deltaText}` : 'ok'})`
              : `Último commit revisado pelo CodeRabbit (${deltaText ? `+${deltaText}` : 'ok'})`,
        detail: en
          ? `Latest commit: ${commitAgo} · Latest CR review: ${reviewAgo}`
          : `Último commit: ${commitAgo} · Último review CR: ${reviewAgo}`,
        className:
          pendingCount > 0
            ? 'border-violet-500/35 bg-violet-500/15 text-violet-300'
            : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
      };
    case 'reviewing_commit':
      return {
        status: sync.status,
        short: en ? '⏳ CR running' : '⏳ CR rodando',
        label: en
          ? 'CodeRabbit triggered after latest commit (in progress)'
          : 'CodeRabbit disparado após o último commit (em andamento)',
        detail: en
          ? `Latest commit: ${commitAgo} · Triggered: ${formatRelativeTime(sync.lastTriggeredAt, lang)}`
          : `Último commit: ${commitAgo} · Disparado: ${formatRelativeTime(sync.lastTriggeredAt, lang)}`,
        className: 'border-sky-500/35 bg-sky-500/15 text-sky-300',
      };
    case 'stale_before_commit':
      return {
        status: sync.status,
        short: deltaText
          ? `${en ? '⚠ Commit w/o CR' : '⚠ Commit s/ CR'} (-${deltaText})`
          : en
            ? '⚠ Commit w/o CR'
            : '⚠ Commit s/ CR',
        label: en
          ? 'Latest commit has not been reviewed by CodeRabbit yet'
          : 'Commit mais recente ainda não foi revisado pelo CodeRabbit',
        detail: en
          ? `Latest commit: ${commitAgo} · Latest CR review: ${reviewAgo} (${deltaText} before) — may contain unchecked changes`
          : `Último commit: ${commitAgo} · Último review CR: ${reviewAgo} (${deltaText} antes) — pode haver erro novo não checado`,
        className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      };
    case 'rate_limited':
      return {
        status: sync.status,
        short: '⚠ CR rate-limit',
        label: en
          ? 'CodeRabbit hit rate limit after latest commit'
          : 'CodeRabbit atingiu rate limit após o último commit',
        detail: en ? `Latest commit: ${commitAgo}` : `Último commit: ${commitAgo}`,
        className: 'border-zinc-500/35 bg-zinc-500/15 text-zinc-300',
      };
    default:
      return null;
  }
}

export function getSlaBadgeStyle(sla) {
  switch (sla?.status) {
    case 'danger_30d':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    case 'overdue_14d':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    case 'overdue_7d':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'warning_7d':
      return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    case 'paused':
      return 'bg-zinc-800/80 text-zinc-400 border-white/10';
    default:
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
  }
}

export function getCiMeta(ciState, lang = 'pt') {
  const en = lang === 'en';
  switch (ciState) {
    case 'SUCCESS':
      return {
        label: en ? 'CI Green' : 'CI Verde',
        short: en ? 'Green' : 'Verde',
        className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
        dot: 'bg-emerald-400',
      };
    case 'FAILURE':
    case 'ERROR':
      return {
        label: en ? 'CI Failing' : 'CI Falhando',
        short: en ? 'Failing' : 'Falhou',
        className: 'text-rose-300 bg-rose-500/15 border-rose-500/35',
        dot: 'bg-rose-400',
      };
    case 'PENDING':
    case 'EXPECTED':
      return {
        label: en ? 'CI Running' : 'CI Rodando',
        short: en ? 'Running' : 'Rodando',
        className: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
        dot: 'bg-amber-400 animate-pulse',
      };
    default:
      return {
        label: en ? 'No CI' : 'Sem CI',
        short: en ? 'No CI' : 'Sem CI',
        className: 'text-zinc-400 bg-zinc-800/80 border-white/10',
        dot: 'bg-zinc-500',
      };
  }
}

export function getCheckoutCommand(pr) {
  if (pr.localWorktree?.path) {
    return `cd "${pr.localWorktree.path}"`;
  }
  return `gh pr checkout ${pr.number} -R ${pr.repo}`;
}

export function getPriorityWeight(priority) {
  return PRIORITY_MAP[priority]?.weight ?? 99;
}

export function sortPrs(prs, sortBy = 'smart') {
  const list = [...prs];
  list.sort((a, b) => {
    if (sortBy === 'updated') {
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    }
    if (sortBy === 'sla') {
      return (b.sla?.days ?? 0) - (a.sla?.days ?? 0);
    }
    if (sortBy === 'priority') {
      const pw = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      if (pw !== 0) return pw;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    }

    // 'smart': Foco hoje -> Prioridade -> SLA vencido -> Estágio acionável -> Atualização
    if (a.selectedForToday !== b.selectedForToday) {
      return a.selectedForToday ? -1 : 1;
    }
    const pw = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
    if (pw !== 0) return pw;
    const slaDiff = (b.sla?.days ?? 0) - (a.sla?.days ?? 0);
    if (slaDiff !== 0) return slaDiff;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
  return list;
}

export function buildSuggestedChecklist(pr, details = null, lang = 'pt') {
  const en = lang === 'en';
  const items = [];
  const makeId = (slug) => `auto-${slug}-${Date.now().toString(36).slice(-4)}`;

  if (pr.role !== 'author') {
    items.push({
      id: makeId('read-diff'),
      text: en
        ? `Review diff (${pr.changedFiles} files, +${pr.additions}/-${pr.deletions})`
        : `Revisar diff (${pr.changedFiles} arquivos, +${pr.additions}/-${pr.deletions})`,
      done: false,
      category: 'review',
    });
    items.push({
      id: makeId('submit-review'),
      text: en
        ? 'Leave actionable comments or approve/request changes'
        : 'Deixar comentários objetivos ou aprovar/solicitar ajustes',
      done: false,
      category: 'review',
    });
  }

  if (pr.hasConflict) {
    items.push({
      id: makeId('rebase'),
      text: en
        ? `Update branch "${pr.headRefName}" with "${pr.baseRefName}" and resolve conflicts`
        : `Atualizar branch "${pr.headRefName}" com "${pr.baseRefName}" e resolver conflitos`,
      done: false,
      category: 'conflict',
    });
  }

  if (details?.checks?.length) {
    const failedChecks = details.checks.filter(
      (c) =>
        c.conclusion === 'FAILURE' ||
        c.conclusion === 'ERROR' ||
        c.conclusion === 'TIMED_OUT'
    );
    for (const chk of failedChecks.slice(0, 4)) {
      items.push({
        id: makeId(`ci-${chk.name.slice(0, 10)}`),
        text: en ? `Fix failing check: ${chk.name}` : `Corrigir check falhando: ${chk.name}`,
        done: false,
        category: 'ci',
      });
    }
  } else if (pr.hasCiFailure) {
    items.push({
      id: makeId('ci'),
      text: en
        ? 'Inspect failing CI logs and fix locally'
        : 'Investigar logs do CI que falhou e corrigir localmente',
      done: false,
      category: 'ci',
    });
  }

  if (details?.reviewThreads?.length) {
    const openThreads = details.reviewThreads.filter((t) => !t.isResolved);
    const byFile = new Map();
    for (const t of openThreads) {
      const file = t.path || (en ? 'general' : 'geral');
      byFile.set(file, (byFile.get(file) || 0) + 1);
    }
    for (const [file, count] of Array.from(byFile.entries()).slice(0, 5)) {
      items.push({
        id: makeId('thread'),
        text: en
          ? `Resolve ${count} open thread${count > 1 ? 's' : ''} in ${file}`
          : `Resolver ${count} thread${count > 1 ? 's' : ''} aberta${count > 1 ? 's' : ''} em ${file}`,
        done: false,
        category: 'feedback',
      });
    }
  } else {
    if (pr.autoStage === 'revisar' || pr.autoStage === 'resolver_feedback') {
      items.push({
        id: makeId('feedback'),
        text: en
          ? 'Reply to reviewer comments and apply requested changes'
          : 'Responder comentários do revisor e aplicar ajustes pedidos',
        done: false,
        category: 'feedback',
      });
    }
    if (pr.codeRabbitPendingCount > 0) {
      items.push({
        id: makeId('coderabbit'),
        text: en
          ? `Reply to ${pr.codeRabbitPendingCount} pending CodeRabbit review(s)`
          : `Responder ${pr.codeRabbitPendingCount} review(s) pendente(s) do CodeRabbit`,
        done: false,
        category: 'feedback',
      });
    }
  }

  if (pr.isDraft) {
    items.push({
      id: makeId('ready'),
      text: en
        ? 'Review final scope and mark PR as Ready for review'
        : 'Revisar escopo final e marcar PR como Ready for review',
      done: false,
      category: 'finish',
    });
  } else if (
    (pr.autoStage === 'finalizado' ||
      pr.autoStage === 'finalizar' ||
      pr.autoStage === 'aprovado') &&
    pr.role === 'author'
  ) {
    items.push({
      id: makeId('merge'),
      text: en
        ? 'Confirm green checks and finish/merge the PR'
        : 'Confirmar checks verdes e finalizar/fazer merge da PR',
      done: false,
      category: 'finish',
    });
  }

  if (!items.length) {
    items.push({
      id: makeId('check'),
      text: en
        ? 'Follow up on upcoming reviews on GitHub'
        : 'Acompanhar próximas revisões no GitHub',
      done: false,
      category: 'manual',
    });
  }

  return items;
}

export function formatDiscordPrLine(pr, stripIssueSuffix = true) {
  let title = (pr.title || '').trim();
  if (stripIssueSuffix) {
    title = title.replace(/\s*\(#\d+\)\s*$/, '').trim();
  }
  const safeTitle = title.replace(/\[/g, '(').replace(/\]/g, ')');
  return `[#${pr.number} ${safeTitle}](${pr.url})`;
}

export function getReviewerBadgeMeta(reviewerOrState, lang = 'pt') {
  const en = lang === 'en';
  const rev =
    typeof reviewerOrState === 'object' && reviewerOrState !== null
      ? reviewerOrState
      : { state: reviewerOrState, reRequested: false };

  const isPending = rev.reRequested === true || rev.state === 'REQUESTED';

  if (isPending) {
    return {
      label: en ? 'Review pending' : 'Revisão pendente',
      symbol: '⏳',
      className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      isApprovalOrRequest: true,
      shouldShow: true,
      isPending: true,
    };
  }

  switch (rev.state) {
    case 'APPROVED':
      return {
        label: en ? 'Approved' : 'Aprovou',
        symbol: '✓',
        className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
        isApprovalOrRequest: true,
        shouldShow: true,
        isApproved: true,
      };
    case 'CHANGES_REQUESTED':
    case 'CHANGES_REQUESTED_ADDRESSED':
      return {
        label: en ? 'Changes requested' : 'Alterações solicitadas',
        symbol: '!',
        className: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
        isApprovalOrRequest: true,
        shouldShow: true,
        isChangesRequested: true,
      };
    case 'REQUESTED':
      return {
        label: en ? 'Review pending' : 'Revisão pendente',
        symbol: '⏳',
        className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
        isApprovalOrRequest: true,
        shouldShow: true,
        isPending: true,
      };
    default:
      return {
        label: en ? 'Commented' : 'Comentou',
        symbol: '💬',
        className: 'border-white/10 bg-white/5 text-zinc-300',
        isApprovalOrRequest: false,
        shouldShow: false,
      };
  }
}

export function buildAgentPrompt(pr, details = null, lang = 'pt') {
  const en = lang === 'en';
  const lines = [
    en
      ? `Work on PR #${pr.number} (${pr.repo}): ${pr.title}`
      : `Trabalhar na PR #${pr.number} (${pr.repo}): ${pr.title}`,
    `URL: ${pr.url}`,
    `Branch: ${pr.headRefName} -> ${pr.baseRefName}`,
  ];
  if (pr.localWorktree?.path) {
    lines.push(`${en ? 'Local worktree' : 'Worktree local'}: ${pr.localWorktree.path}`);
  }
  lines.push(
    `${en ? 'Current status' : 'Situação atual'}: ${localizeBackendText(pr.actionReason, lang)}`
  );

  if (pr.hasConflict) {
    lines.push(
      en
        ? `Conflict detected: update with origin/${pr.baseRefName} (git fetch origin ${pr.baseRefName} && git rebase origin/${pr.baseRefName}) and resolve conflicts.`
        : `Conflito detectado: atualizar com origin/${pr.baseRefName} (git fetch origin ${pr.baseRefName} && git rebase origin/${pr.baseRefName}) e resolver conflitos.`
    );
  }

  if (details?.checks?.length) {
    const failed = details.checks.filter((c) =>
      ['FAILURE', 'ERROR', 'TIMED_OUT'].includes(c.conclusion)
    );
    if (failed.length) {
      lines.push(
        `${en ? 'Failing checks' : 'Checks falhando'}: ${failed.map((c) => c.name).join(', ')}`
      );
    }
  } else if (pr.hasCiFailure) {
    lines.push(
      en
        ? 'There are failing CI checks — inspect logs with `gh pr checks`.'
        : 'Existem checks do CI falhando — inspecionar logs com `gh pr checks`.'
    );
  }

  if (details?.reviewThreads?.length) {
    const openHumanThreads = details.reviewThreads.filter(
      (t) => !t.isResolved && t.comments.some((c) => !c.isBot)
    );
    if (openHumanThreads.length) {
      lines.push(en ? 'Unresolved human threads:' : 'Threads humanas não resolvidas:');
      for (const t of openHumanThreads.slice(0, 6)) {
        const first = t.comments.find((c) => !c.isBot) || t.comments[0];
        const excerpt = (first?.body || '').replace(/\s+/g, ' ').slice(0, 180);
        lines.push(
          `- ${t.path || (en ? 'file' : 'arquivo')}${t.line ? `:${t.line}` : ''} (@${first?.author}): ${excerpt}`
        );
      }
    }
  }

  const crPendingThreads =
    details?.codeRabbitPendingThreads ?? pr.codeRabbitPendingThreads ?? [];
  const crPendingCount =
    details?.codeRabbitPendingCount ??
    pr.codeRabbitPendingCount ??
    crPendingThreads.length;

  if (crPendingCount > 0) {
    lines.push(
      en
        ? `CodeRabbit reviews awaiting reply (${crPendingCount}): inspect each item in code, fix valid issues, and reply/resolve the PR threads:`
        : `Reviews do CodeRabbit aguardando resposta (${crPendingCount}): analisar cada ponto no código, corrigir o que proceder e responder/resolver as threads na PR:`
    );
    for (const t of crPendingThreads.slice(0, 10)) {
      const loc = `${t.path || (en ? 'file' : 'arquivo')}${t.line ? `:${t.line}` : ''}`;
      const suffix = t.isOutdated ? ' [outdated]' : '';
      const detail = t.aiPrompt
        ? `\n  ${en ? 'CodeRabbit instruction' : 'Instrução CodeRabbit'}: ${t.aiPrompt.replace(/\n+/g, ' ')}`
        : t.excerpt
          ? `: ${t.excerpt}`
          : '';
      lines.push(`- ${loc}${suffix}${detail}`);
    }
    if (crPendingThreads.length > 10) {
      lines.push(
        en
          ? `- ... and ${crPendingThreads.length - 10} more CodeRabbit comment(s).`
          : `- ... e mais ${crPendingThreads.length - 10} comentário(s) do CodeRabbit.`
      );
    }
  }

  const crFixAllPrompts =
    details?.codeRabbitFixAllPrompts ?? pr.codeRabbitFixAllPrompts ?? [];
  const latestFixAll =
    details?.latestCodeRabbitFixAllPrompt ??
    pr.latestCodeRabbitFixAllPrompt ??
    crFixAllPrompts[0] ??
    null;

  if (latestFixAll?.prompt) {
    const metaParts = [];
    if (latestFixAll.commitOid) metaParts.push(`commit ${latestFixAll.commitOid}`);
    if (latestFixAll.submittedAt) {
      metaParts.push(formatRelativeTime(latestFixAll.submittedAt, lang));
    }
    if (crFixAllPrompts.length > 1) {
      metaParts.push(
        en
          ? `${crFixAllPrompts.length} reviews total — using latest`
          : `${crFixAllPrompts.length} revisões no total — usando a mais recente`
      );
    }
    const meta = metaParts.length ? ` (${metaParts.join(', ')})` : '';
    lines.push(
      en
        ? `CodeRabbit "Prompt to fix all issues"${meta}:`
        : `Prompt to fix all issues do CodeRabbit${meta}:`
    );
    lines.push('```');
    lines.push(latestFixAll.prompt);
    lines.push('```');
  }

  const crSync = details?.codeRabbitCommitSync ?? pr.codeRabbitCommitSync ?? null;
  if (crSync?.status === 'stale_before_commit') {
    const delta = formatDeltaDuration(crSync.deltaMs);
    lines.push(
      en
        ? `CodeRabbit vs latest commit warning: latest commit (${formatRelativeTime(crSync.lastCommitDate, lang)}) is ${delta ? `${delta} ` : ''}newer than the last CodeRabbit review (${formatRelativeTime(crSync.lastReviewedAt, lang)}) — carefully verify the latest commit for issues.`
        : `Atenção CodeRabbit vs último commit: o último commit (${formatRelativeTime(crSync.lastCommitDate, lang)}) é ${delta ? `${delta} ` : ''}mais recente que o último review do CodeRabbit (${formatRelativeTime(crSync.lastReviewedAt, lang)}) — validar cuidadosamente se o commit mais recente não tem erros.`
    );
  } else if (crSync?.status === 'reviewing_commit') {
    lines.push(
      en
        ? 'CodeRabbit: review triggered after the latest commit and still in progress.'
        : 'CodeRabbit: review disparado após o último commit e ainda em andamento.'
    );
  } else if (crSync?.status === 'rate_limited') {
    lines.push(
      en
        ? 'CodeRabbit warning: rate-limited after the latest commit — manually review the latest diff.'
        : 'Atenção CodeRabbit: sofreu rate limit após o último commit — revisar manualmente o diff mais recente.'
    );
  } else if (crSync?.status === 'reviewed_after_commit' && crPendingCount === 0) {
    lines.push(
      en
        ? 'CodeRabbit: latest commit already reviewed with no pending comments.'
        : 'CodeRabbit: último commit já foi revisado sem comentários pendentes.'
    );
  }

  if (pr.role === 'author') {
    if (crPendingCount > 0) {
      lines.push(
        en
          ? 'Use `/review` or fix valid CodeRabbit points and remaining issues, reply/resolve the PR threads, validate with tests, and update the PR.'
          : 'Use `/review` ou corrija os pontos válidos do CodeRabbit e demais pendências, responda/resolva as threads na PR, valide com testes e atualize a PR.'
      );
    } else {
      lines.push(
        en
          ? 'Use `/review` or fix remaining issues, validate with tests, and update the PR.'
          : 'Use `/review` ou corrija o que estiver pendente, valide com testes e atualize a PR.'
      );
    }
  } else if (crPendingCount > 0) {
    lines.push(
      en
        ? 'Analyze and reply to the pending CodeRabbit reviews above and perform a careful technical review of the diff.'
        : 'Analise e responda os reviews pendentes do CodeRabbit acima e faça uma revisão técnica cuidadosa do diff.'
    );
  } else {
    lines.push(
      en
        ? 'Perform a careful technical review of the diff and point out risks or required adjustments.'
        : 'Faça uma revisão técnica cuidadosa do diff e aponte riscos ou ajustes necessários.'
    );
  }

  return lines.join('\n');
}
