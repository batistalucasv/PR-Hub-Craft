import React, { useEffect, useRef, useState } from 'react';
import {
  Star,
  ExternalLink,
  Terminal,
  Copy,
  Check,
  GitMerge,
  Laptop,
  MessageSquare,
  CheckSquare,
  StickyNote,
  Plus,
  Clock,
  AlertOctagon,
  ChevronUp,
  ChevronDown,
  Zap,
  Bot,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { fetchPrDetails, getCachedPrDetails, executePrRebase } from '../api.js';
import {
  PRIORITY_MAP,
  getStages,
  getArchivedStage,
  getWorkStatuses,
  buildAgentPrompt,
  formatRelativeTime,
  getCheckoutCommand,
  getCiMeta,
  getCodeRabbitSyncMeta,
  getReviewerBadgeMeta,
  getSlaBadgeStyle,
  getStageMeta,
  getTagStyle,
  getWorkStatusMeta,
} from '../utils/prHelpers.js';
import { localizeBackendText, localizeTagLabel, useI18n } from '../i18n.jsx';

export default function PrCard({
  pr,
  customTags,
  onOpenDetail,
  onPatchPr,
  onSelectRepo,
  minimized,
  onToggleMinimize,
  expandedChecklist = false,
  draggable = false,
  onDragStart,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [rebaseRunning, setRebaseRunning] = useState(false);
  const [rebaseCardStatus, setRebaseCardStatus] = useState(null);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [localMinimized, setLocalMinimized] = useState(false);
  const tagMenuRef = useRef(null);

  useEffect(() => {
    if (!tagMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setTagMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setTagMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tagMenuOpen]);

  const isControlledMin = typeof minimized === 'boolean';
  const isMinimized = isControlledMin ? minimized : localMinimized;

  function handleMinimizeClick(e) {
    e.stopPropagation();
    if (onToggleMinimize) onToggleMinimize();
    else setLocalMinimized((v) => !v);
  }

  const { lang, t } = useI18n();
  const stages = getStages(lang);
  const archivedStage = getArchivedStage(lang);
  const workStatuses = getWorkStatuses(lang);

  const priorityMeta = PRIORITY_MAP[pr.priority] || null;
  const workMeta = getWorkStatusMeta(pr.workStatus, lang);
  const ciMeta = getCiMeta(pr.ciState, lang);
  const crSyncMeta = getCodeRabbitSyncMeta(
    pr.codeRabbitCommitSync,
    pr.codeRabbitPendingCount,
    lang
  );
  const stageMeta = getStageMeta(pr.stage, lang);
  const slaClass = getSlaBadgeStyle(pr.sla);

  const checklistTotal = pr.checklist?.length || 0;
  const checklistDone = pr.checklist?.filter((c) => c.done).length || 0;

  const tagMap = new Map(customTags.map((t) => [t.id, t]));
  const assignedTags = (pr.tags || []).map((id) => tagMap.get(id)).filter(Boolean);

  async function copyText(key, value, e) {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // ignore clipboard errors
    }
  }

  async function handleCopyFullPrompt(e) {
    e.stopPropagation();
    let details = getCachedPrDetails(pr.owner, pr.repoName, pr.number);
    if (!details) {
      setLoadingPrompt(true);
      try {
        details = await fetchPrDetails(pr.owner, pr.repoName, pr.number);
      } catch {
        details = null;
      } finally {
        setLoadingPrompt(false);
      }
    }
    const fullPrompt = buildAgentPrompt(pr, details, lang);
    await copyText('prompt', fullPrompt, e);
  }

  async function handleQuickRebase(e) {
    e.stopPropagation();
    setRebaseRunning(true);
    setRebaseCardStatus(null);
    try {
      const res = await executePrRebase(pr.owner, pr.repoName, pr.number, 'rebase', {
        baseRefName: pr.baseRefName,
        headRefName: pr.headRefName,
      });
      if (res.ok) {
        setRebaseCardStatus('success');
        setTimeout(() => setRebaseCardStatus(null), 3500);
      } else if (res.status === 'conflict') {
        setRebaseCardStatus('conflict');
        onOpenDetail?.(pr);
      } else {
        setRebaseCardStatus('error');
      }
    } catch {
      setRebaseCardStatus('error');
    } finally {
      setRebaseRunning(false);
    }
  }

  function handleCyclePriority(e) {
    e.stopPropagation();
    const order = [null, 'P0', 'P1', 'P2', 'P3'];
    const idx = order.indexOf(pr.priority ?? null);
    const next = order[(idx + 1) % order.length];
    onPatchPr(pr.prKey, { priority: next });
  }

  function handleToggleTag(tagId, e) {
    e.stopPropagation();
    const exists = (pr.tags || []).includes(tagId);
    onPatchPr(pr.prKey, exists ? { removeTag: tagId } : { addTag: tagId });
  }

  function handleToggleChecklistItem(itemId, e) {
    e.stopPropagation();
    const nextChecklist = (pr.checklist || []).map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    onPatchPr(pr.prKey, { checklist: nextChecklist });
  }

  if (isMinimized) {
    return (
      <article
        draggable={draggable}
        onDragStart={onDragStart}
        onClick={() => onOpenDetail(pr)}
        className={`group flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2 transition ${
          workMeta
            ? workMeta.cardClass
            : pr.selectedForToday
            ? 'border-amber-500/40 bg-zinc-900/95 hover:border-amber-400/60'
            : 'border-white/10 bg-zinc-900/75 hover:border-white/20 hover:bg-zinc-900'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${ciMeta.dot}`} title={ciMeta.label} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRepo?.(pr.repo);
              }}
              className="truncate font-mono text-zinc-400 hover:text-indigo-300"
            >
              {pr.repo}
            </button>
            <span className="shrink-0 font-mono font-semibold text-indigo-300">
              #{pr.number}
            </span>
            {pr.hasConflict && (
              <AlertOctagon className="h-3 w-3 shrink-0 text-rose-400" title={t('Conflict', 'Conflito')} />
            )}
            {pr.codeRabbitPendingCount > 0 && (
              <Bot
                className="h-3 w-3 shrink-0 text-violet-300"
                title={t(
                  `${pr.codeRabbitPendingCount} CodeRabbit review(s) awaiting reply`,
                  `${pr.codeRabbitPendingCount} review(s) do CodeRabbit aguardando resposta`
                )}
              />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {workMeta && (
              <span
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[10px] font-semibold ${workMeta.badgeClass}`}
                title={`${t('Work status', 'Etapa de trabalho')}: ${workMeta.label}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${workMeta.dotClass}`} />
                {workMeta.short}
              </span>
            )}
            {priorityMeta && (
              <span
                className={`rounded border px-1 py-0.2 text-[10px] font-semibold ${priorityMeta.badgeClass}`}
              >
                {priorityMeta.short}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPatchPr(pr.prKey, { selectedForToday: !pr.selectedForToday });
              }}
              title={t('Toggle Focus Queue', 'Alternar Fila de Foco')}
              className="rounded p-0.5 text-zinc-500 hover:text-amber-300"
            >
              <Star
                className={`h-3 w-3 ${
                  pr.selectedForToday ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>
            <button
              type="button"
              onClick={handleMinimizeClick}
              title={t('Expand card', 'Expandir card')}
              className="rounded p-0.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h3 className="line-clamp-1 text-xs font-medium text-zinc-100">
          {pr.title}
        </h3>
      </article>
    );
  }

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => onOpenDetail(pr)}
      className={`group relative flex cursor-pointer flex-col gap-2.5 rounded-2xl border p-3.5 transition ${
        workMeta
          ? workMeta.cardClass
          : pr.selectedForToday
          ? 'border-amber-500/40 bg-zinc-900/95 shadow-lg shadow-amber-500/5 hover:border-amber-400/60'
          : 'border-white/10 bg-zinc-900/75 hover:border-white/20 hover:bg-zinc-900'
      }`}
    >
      {/* Topo: Repo, #num, Draft, Foco, Prioridade */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectRepo?.(pr.repo);
            }}
            title={t(`Filter by repository ${pr.repo}`, `Filtrar pelo repositório ${pr.repo}`)}
            className="truncate rounded px-1 py-0.5 font-mono text-[11px] text-zinc-400 transition hover:bg-white/10 hover:text-indigo-300"
          >
            {pr.repo}
          </button>
          <span className="font-mono font-semibold text-indigo-300">#{pr.number}</span>
          {pr.isDraft && (
            <span className="rounded-md border border-zinc-600/50 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
              Draft
            </span>
          )}
          {pr.role !== 'author' && (
            <span className="rounded-md border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
              @{pr.author.login}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Status de Trabalho (Executando / Parado / Terminado / Sem) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[11px] font-semibold transition ${
              workMeta
                ? workMeta.badgeClass
                : 'border-white/10 bg-zinc-950/60 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
            }`}
            title={t(
              'Set card work status (Running, Paused, Done, or None)',
              'Definir etapa de trabalho no card (Executando, Parado, Terminado ou Sem)'
            )}
          >
            {workMeta && (
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${workMeta.dotClass}`} />
            )}
            <select
              value={pr.workStatus || ''}
              onChange={(e) =>
                onPatchPr(pr.prKey, { workStatus: e.target.value || null })
              }
              aria-label={t('Work status', 'Etapa de trabalho')}
              className="cursor-pointer bg-transparent pr-0.5 text-[11px] font-semibold focus:outline-none"
            >
              <option value="" className="bg-zinc-900 text-zinc-300">
                Status
              </option>
              {workStatuses.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-zinc-900 text-zinc-100">
                  {ws.icon} {ws.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Prioridade */}
          <button
            type="button"
            onClick={handleCyclePriority}
            title={t(
              'Click to cycle priority (P0 → P1 → P2 → P3)',
              'Clique para alternar prioridade (P0 → P1 → P2 → P3)'
            )}
            className={`rounded-lg border px-1.5 py-0.5 text-[11px] font-semibold transition ${
              priorityMeta
                ? priorityMeta.badgeClass
                : 'border-white/10 bg-zinc-950/60 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
            }`}
          >
            {priorityMeta ? priorityMeta.short : t('Prio', 'Prior.')}
          </button>

          {/* Estrela Foco Hoje */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPatchPr(pr.prKey, { selectedForToday: !pr.selectedForToday });
            }}
            title={
              pr.selectedForToday
                ? t('Remove from Focus Queue', 'Remover da Fila de Foco')
                : t('Add to Focus Queue (Today)', 'Adicionar à Fila de Foco (Hoje)')
            }
            className={`rounded-lg border p-1 transition ${
              pr.selectedForToday
                ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                : 'border-white/10 bg-zinc-950/60 text-zinc-500 hover:border-white/20 hover:text-amber-300'
            }`}
          >
            <Star
              className={`h-3.5 w-3.5 ${pr.selectedForToday ? 'fill-amber-400' : ''}`}
            />
          </button>

          {/* Minimizar Card */}
          <button
            type="button"
            onClick={handleMinimizeClick}
            title={t('Collapse card', 'Minimizar card')}
            className="rounded-lg border border-white/10 bg-zinc-950/60 p-1 text-zinc-400 transition hover:border-white/20 hover:text-zinc-100"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Título */}
      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 group-hover:text-zinc-50">
        {pr.title}
      </h3>

      {/* Motivo / O que fazer */}
      <div
        className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] ${stageMeta.border} ${stageMeta.bg}`}
      >
        <span className={`truncate font-medium ${stageMeta.accent}`}>
          {localizeBackendText(pr.actionReason, lang)}
        </span>
        {pr.manualStage && (
          <span className="shrink-0 rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-zinc-300">
            Manual
          </span>
        )}
      </div>

      {/* Reviews pendentes do CodeRabbit */}
      {pr.codeRabbitPendingCount > 0 && (
        <div
          className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-[11px] text-violet-200"
          title={
            pr.codeRabbitPendingThreads?.length
              ? pr.codeRabbitPendingThreads
                  .map(
                    (t) =>
                      `${t.path}${t.line ? `:${t.line}` : ''}${t.excerpt ? ` — ${t.excerpt}` : ''}`
                  )
                  .join('\n')
              : t(
                  `${pr.codeRabbitPendingCount} CodeRabbit review(s) awaiting reply`,
                  `${pr.codeRabbitPendingCount} review(s) do CodeRabbit aguardando resposta`
                )
          }
        >
          <Bot className="h-3.5 w-3.5 shrink-0 text-violet-300" />
          <span className="truncate">
            <strong className="font-semibold">
              CodeRabbit ({pr.codeRabbitPendingCount}):
            </strong>{' '}
            {pr.codeRabbitPendingThreads?.length
              ? pr.codeRabbitPendingThreads
                  .slice(0, 3)
                  .map((t) => `${t.path.split('/').pop()}${t.line ? `:${t.line}` : ''}`)
                  .join(', ')
              : t('comments awaiting reply', 'comentários aguardando resposta')}
            {pr.codeRabbitPendingThreads?.length > 3
              ? ` +${pr.codeRabbitPendingThreads.length - 3}`
              : ''}
          </span>
        </div>
      )}

      {/* Radar de Saúde & SLA */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${ciMeta.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${ciMeta.dot}`} />
          {ciMeta.short}
        </span>

        {pr.hasConflict && (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-rose-300">
            <AlertOctagon className="h-3 w-3" />
            {t('Conflict', 'Conflito')}
          </span>
        )}

        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${slaClass}`}
          title={localizeBackendText(pr.sla?.detail, lang)}
        >
          <Clock className="h-3 w-3" />
          {localizeBackendText(pr.sla?.label, lang)}
        </span>

        {pr.localWorktree && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-1.5 py-0.5 text-cyan-200"
            title={`${t('Local worktree', 'Worktree local')}: ${pr.localWorktree.path}`}
          >
            <Laptop className="h-3 w-3" />
            Local
          </span>
        )}

        {pr.localWorktree && (pr.hasConflict || pr.isQuickWinConflict) ? (
          <button
            type="button"
            disabled={rebaseRunning}
            onClick={handleQuickRebase}
            title={`${t('Execute 1-Click Local Rebase in worktree', 'Executar rebase local em 1 clique na worktree')}: ${pr.localWorktree.path}`}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition ${
              rebaseCardStatus === 'success'
                ? 'border-emerald-500/60 bg-emerald-500/30 text-emerald-200'
                : rebaseCardStatus === 'conflict'
                ? 'border-rose-500/60 bg-rose-500/30 text-rose-200'
                : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30'
            }`}
          >
            {rebaseRunning ? (
              <Loader2 className="h-3 w-3 animate-spin text-emerald-300" />
            ) : rebaseCardStatus === 'success' ? (
              <Check className="h-3 w-3 text-emerald-300" />
            ) : (
              <Zap className="h-3 w-3 text-emerald-400" />
            )}
            <span>
              {rebaseRunning
                ? t('Rebasing...', 'Rebaseando...')
                : rebaseCardStatus === 'success'
                ? t('Rebased ✓', 'Rebaseado ✓')
                : t('1-Click Rebase', '1-Click Rebase')}
            </span>
          </button>
        ) : pr.isQuickWinConflict ? (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300"
            title={t(
              'Quick win: green CI and no pending review — just needs rebase',
              'Vitória rápida: CI verde e sem review pendente — só precisa de rebase'
            )}
          >
            <Zap className="h-3 w-3" />
            {t('Rebase Only', 'Só Rebase')}
          </span>
        ) : null}

        {pr.feedbackAddressed && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-sky-500/35 bg-sky-500/15 px-1.5 py-0.5 text-sky-300"
            title={t(
              'You pushed new commits after the latest changes requested',
              'Você enviou novos commits após o último pedido de mudanças'
            )}
          >
            <Sparkles className="h-3 w-3" />
            {t('Addressed', 'Corrigida')}
          </span>
        )}

        {pr.codeRabbitPendingCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-violet-500/35 bg-violet-500/15 px-1.5 py-0.5 text-violet-300"
            title={t(
              `${pr.codeRabbitPendingCount} CodeRabbit review(s) awaiting reply`,
              `${pr.codeRabbitPendingCount} review(s) do CodeRabbit aguardando resposta`
            )}
          >
            <Bot className="h-3 w-3" />
            CodeRabbit ({pr.codeRabbitPendingCount})
          </span>
        )}

        {crSyncMeta && (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${crSyncMeta.className}`}
            title={`${crSyncMeta.label}\n${crSyncMeta.detail}`}
          >
            {crSyncMeta.short}
          </span>
        )}
      </div>

      {/* Revisores Humanos (Approval verde, request vermelho ou pending review âmbar) */}
      {(() => {
        const activeReviewers = (pr.humanReviewers || [])
          .map((rev) => ({ rev, meta: getReviewerBadgeMeta(rev, lang) }))
          .filter((item) => item.meta && item.meta.shouldShow);

        if (activeReviewers.length === 0) return null;

        return (
          <div className="flex flex-wrap items-center gap-1">
            {activeReviewers.map(({ rev, meta }) => (
              <span
                key={rev.login}
                title={`@${rev.login}: ${meta.label}`}
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}
              >
                @{rev.login} {meta.symbol}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Tags personalizadas + botão + */}
      <div className="relative flex flex-wrap items-center gap-1">
        {assignedTags.map((tag) => {
          const style = getTagStyle(tag.color);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={(e) => handleToggleTag(tag.id, e)}
              title={t('Click to remove tag', 'Clique para remover tag')}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition hover:opacity-80 ${style.pill}`}
            >
              {localizeTagLabel(tag, lang)}
            </button>
          );
        })}

        <div
          ref={tagMenuRef}
          onMouseLeave={() => setTagMenuOpen(false)}
          className="relative"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTagMenuOpen((v) => !v);
            }}
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
          >
            <Plus className="h-2.5 w-2.5" />
            Tag
          </button>

          {tagMenuOpen && (
            <div className="absolute left-0 top-full z-20 pt-1">
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-52 rounded-xl border border-white/15 bg-zinc-950 p-1.5 shadow-2xl"
              >
              <div className="mb-1 flex items-center justify-between px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500">
                <span>{t('Select tags', 'Selecionar tags')}</span>
                <button
                  type="button"
                  onClick={() => setTagMenuOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  {t('Close', 'Fechar')}
                </button>
              </div>
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {customTags.map((tag) => {
                  const active = (pr.tags || []).includes(tag.id);
                  const style = getTagStyle(tag.color);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={(e) => handleToggleTag(tag.id, e)}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs transition ${
                        active ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                        {localizeTagLabel(tag, lang)}
                      </span>
                      {active && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checklist expandido no Modo Foco */}
      {expandedChecklist && checklistTotal > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="space-y-1 rounded-xl border border-white/10 bg-zinc-950/60 p-2.5"
        >
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-zinc-400">
            <span>{t('PR Checklist', 'Checklist da PR')}</span>
            <span>
              {checklistDone}/{checklistTotal}
            </span>
          </div>
          {pr.checklist.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => handleToggleChecklistItem(item.id, e)}
                className="mt-0.5 rounded border-white/20 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
              />
              <span className={item.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Rodapé: metadados + ações rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2.5">
          <span title={t('Updated', 'Atualizada')}>{formatRelativeTime(pr.updatedAt, lang)}</span>
          {pr.totalComments > 0 && (
            <span className="inline-flex items-center gap-1" title={t('Comments', 'Comentários')}>
              <MessageSquare className="h-3 w-3" />
              {pr.totalComments}
            </span>
          )}
          {checklistTotal > 0 && (
            <span
              className={`inline-flex items-center gap-1 ${
                checklistDone === checklistTotal ? 'text-emerald-400' : 'text-zinc-300'
              }`}
              title={t('Checklist progress', 'Progresso do checklist')}
            >
              <CheckSquare className="h-3 w-3" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {pr.notes?.trim() && (
            <span className="inline-flex items-center gap-1 text-indigo-300" title={t('Has notes', 'Possui notas')}>
              <StickyNote className="h-3 w-3" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mover rápido de estágio */}
          <select
            value={pr.manualStage || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onPatchPr(pr.prKey, {
                manualStage: e.target.value || null,
              });
            }}
            title={t('Move stage manually', 'Mover estágio manualmente')}
            className="max-w-[96px] rounded-md border border-white/10 bg-zinc-950/80 px-1.5 py-0.5 text-[10px] text-zinc-300 focus:outline-none"
          >
            <option value="">Auto ({stageMeta.shortLabel})</option>
            {[...stages, archivedStage].map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortLabel}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCopyFullPrompt}
            disabled={loadingPrompt}
            title={t(
              'Copy full internal PR prompt for AI agent',
              'Copiar prompt interno e completo da PR para enviar ao agente'
            )}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200 transition hover:bg-white/10"
          >
            {copiedKey === 'prompt' ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : loadingPrompt ? (
              <Loader2 className="h-3 w-3 animate-spin text-emerald-300" />
            ) : (
              <Bot className="h-3 w-3 text-emerald-300" />
            )}
            Prompt
          </button>

          <button
            type="button"
            onClick={(e) => copyText('review', `/review ${pr.url}`, e)}
            title={`${t('Copy', 'Copiar')} "/review ${pr.url}"`}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200 transition hover:bg-white/10"
          >
            {copiedKey === 'review' ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-indigo-300" />
            )}
            /review
          </button>

          <button
            type="button"
            onClick={(e) => copyText('checkout', getCheckoutCommand(pr), e)}
            title={`${t('Copy command', 'Copiar comando')}: ${getCheckoutCommand(pr)}`}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200 transition hover:bg-white/10"
          >
            {copiedKey === 'checkout' ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Terminal className="h-3 w-3 text-cyan-300" />
            )}
            {pr.localWorktree ? 'cd' : 'gh'}
          </button>

          <a
            href={pr.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={t('Open PR on GitHub', 'Abrir PR no GitHub')}
            className="inline-flex items-center rounded-md border border-white/10 bg-white/5 p-1 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}
