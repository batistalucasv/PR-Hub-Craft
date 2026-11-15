import React, { useEffect, useState } from 'react';
import {
  X,
  Star,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Sparkles,
  Plus,
  Trash2,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  Laptop,
  MessageSquare,
  ShieldAlert,
  Loader2,
  Send,
  RefreshCw,
  Rocket,
  BellRing,
  Zap,
  AlertTriangle,
  GitMerge,
} from 'lucide-react';
import { fetchPrDetails, runPrGhAction, executePrRebase } from '../api.js';
import {
  getPriorities,
  getStages,
  getArchivedStage,
  getWorkStatuses,
  buildAgentPrompt,
  buildSuggestedChecklist,
  formatDiscordPrLine,
  formatRelativeTime,
  getCheckoutCommand,
  getCodeRabbitSyncMeta,
  getReviewerBadgeMeta,
  getSlaBadgeStyle,
  getStageMeta,
  getTagStyle,
  getWorkStatusMeta,
} from '../utils/prHelpers.js';
import { localizeBackendText, localizeTagLabel, useI18n } from '../i18n.jsx';

export default function PrDetailDrawer({
  pr,
  customTags,
  onClose,
  onPatchPr,
  onAfterGhAction,
}) {
  const { lang, t } = useI18n();
  const priorities = getPriorities(lang);
  const stages = getStages(lang);
  const archivedStage = getArchivedStage(lang);
  const workStatuses = getWorkStatuses(lang);

  const [activeTab, setActiveTab] = useState('plan');
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [hideBots, setHideBots] = useState(true);
  const [notesDraft, setNotesDraft] = useState('');
  const [saveBadge, setSaveBadge] = useState('saved');
  const [newTaskText, setNewTaskText] = useState('');
  const [copiedBtn, setCopiedBtn] = useState(null);
  const [ghActionLoading, setGhActionLoading] = useState(null);
  const [ghActionFeedback, setGhActionFeedback] = useState(null);
  const [rebaseLoading, setRebaseLoading] = useState(false);
  const [rebaseFeedback, setRebaseFeedback] = useState(null);

  useEffect(() => {
    if (!pr) return;
    setNotesDraft(pr.notes || '');
    setSaveBadge('saved');
    setDetails(null);
    setDetailsError(null);
    setGhActionFeedback(null);
    setGhActionLoading(null);
    setRebaseFeedback(null);
    setRebaseLoading(false);

    let cancelled = false;
    setDetailsLoading(true);
    fetchPrDetails(pr.owner, pr.repoName, pr.number)
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch((err) => {
        if (!cancelled) setDetailsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pr?.prKey]);

  // Debounce auto-save das notas
  useEffect(() => {
    if (!pr) return;
    if (notesDraft === (pr.notes || '')) return;

    setSaveBadge('saving');
    const timer = setTimeout(() => {
      onPatchPr(pr.prKey, { notes: notesDraft })
        .then(() => setSaveBadge('saved'))
        .catch(() => setSaveBadge('error'));
    }, 450);

    return () => clearTimeout(timer);
  }, [notesDraft, pr?.prKey]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!pr) return null;

  const stageMeta = getStageMeta(pr.stage, lang);
  const workMeta = getWorkStatusMeta(pr.workStatus, lang);
  const slaClass = getSlaBadgeStyle(pr.sla);

  async function copyQuick(key, val) {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedBtn(key);
      setTimeout(() => setCopiedBtn(null), 1500);
    } catch {
      // ignore
    }
  }

  async function triggerGhAction(action, payload = {}) {
    setGhActionLoading(action);
    setGhActionFeedback(null);
    try {
      const res = await runPrGhAction(pr.owner, pr.repoName, pr.number, action, payload);
      setGhActionFeedback({
        ok: true,
        text: res.message || t('Action completed on GitHub!', 'Ação concluída no GitHub!'),
      });
      onAfterGhAction?.();
    } catch (err) {
      setGhActionFeedback({
        ok: false,
        text: err.message || t('Failed to run action', 'Falha ao executar ação'),
      });
    } finally {
      setGhActionLoading(null);
    }
  }

  async function handleLocalRebase(action = 'rebase') {
    setRebaseLoading(action);
    setRebaseFeedback(null);
    try {
      const res = await executePrRebase(pr.owner, pr.repoName, pr.number, action, {
        baseRefName: pr.baseRefName,
        headRefName: pr.headRefName,
      });
      setRebaseFeedback(res);
      if (res.ok) {
        onAfterGhAction?.();
      }
    } catch (err) {
      setRebaseFeedback({
        ok: false,
        status: 'error',
        message: err.message,
      });
    } finally {
      setRebaseLoading(false);
    }
  }

  function handleAddChecklistItem(e) {
    e.preventDefault();
    const text = newTaskText.trim();
    if (!text) return;
    const next = [
      ...(pr.checklist || []),
      {
        id: `manual-${Date.now().toString(36)}`,
        text,
        done: false,
        category: 'manual',
      },
    ];
    onPatchPr(pr.prKey, { checklist: next });
    setNewTaskText('');
  }

  function handleSuggestChecklist() {
    const suggested = buildSuggestedChecklist(pr, details, lang);
    const existingTexts = new Set(
      (pr.checklist || []).map((i) => i.text.toLowerCase())
    );
    const toAppend = suggested.filter(
      (s) => !existingTexts.has(s.text.toLowerCase())
    );
    if (toAppend.length === 0) return;
    onPatchPr(pr.prKey, { checklist: [...(pr.checklist || []), ...toAppend] });
  }

  function toggleTask(id) {
    const next = (pr.checklist || []).map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    onPatchPr(pr.prKey, { checklist: next });
  }

  function removeTask(id) {
    const next = (pr.checklist || []).filter((item) => item.id !== id);
    onPatchPr(pr.prKey, { checklist: next });
  }

  function clearDoneTasks() {
    const next = (pr.checklist || []).filter((item) => !item.done);
    onPatchPr(pr.prKey, { checklist: next });
  }

  function toggleTag(tagId) {
    const exists = (pr.tags || []).includes(tagId);
    onPatchPr(pr.prKey, exists ? { removeTag: tagId } : { addTag: tagId });
  }

  const openThreads = (details?.reviewThreads || []).filter((t) => {
    if (t.isResolved) return false;
    if (hideBots && t.comments.every((c) => c.isBot)) return false;
    return true;
  });

  const resolvedThreadsCount = (details?.reviewThreads || []).filter(
    (t) => t.isResolved
  ).length;

  const visibleReviews = (details?.reviews || []).filter((r) =>
    hideBots ? !r.isBot : true
  );
  const visibleComments = (details?.comments || []).filter((c) =>
    hideBots ? !c.isBot : true
  );

  const sortedChecks = [...(details?.checks || [])].sort((a, b) => {
    const score = (c) => {
      if (c.conclusion === 'FAILURE' || c.conclusion === 'ERROR') return 0;
      if (c.status === 'IN_PROGRESS' || c.status === 'QUEUED') return 1;
      if (c.conclusion === 'SUCCESS') return 2;
      return 3;
    };
    return score(a) - score(b);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-zinc-950 shadow-2xl"
      >
        {/* Header fixo */}
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="font-mono">{pr.repo}</span>
                <span className="font-mono font-semibold text-indigo-300">
                  #{pr.number}
                </span>
                {pr.isDraft && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                    Draft
                  </span>
                )}
                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${slaClass}`}>
                  {localizeBackendText(pr.sla?.label, lang)}
                </span>
              </div>
              <h2 className="mt-1.5 text-base font-semibold leading-snug text-white">
                {pr.title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onPatchPr(pr.prKey, { selectedForToday: !pr.selectedForToday })
                }
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                  pr.selectedForToday
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-200'
                    : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    pr.selectedForToday ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
                {pr.selectedForToday ? t('In Focus', 'Em Foco') : t('Focus', 'Focar')}
              </button>

              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                GitHub
              </a>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Controles rápidos: Prioridade, Estágio, Branch, Worktree */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={pr.workStatus || ''}
              onChange={(e) =>
                onPatchPr(pr.prKey, { workStatus: e.target.value || null })
              }
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold focus:outline-none ${
                workMeta
                  ? workMeta.badgeClass
                  : 'border-white/10 bg-zinc-900 text-zinc-300'
              }`}
            >
              <option value="" className="bg-zinc-900 text-zinc-300">
                {t('No work status', 'Sem status de trabalho')}
              </option>
              {workStatuses.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-zinc-900 text-zinc-100">
                  {ws.icon} {ws.label}
                </option>
              ))}
            </select>

            <select
              value={pr.priority || ''}
              onChange={(e) =>
                onPatchPr(pr.prKey, { priority: e.target.value || null })
              }
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 focus:outline-none"
            >
              <option value="">{t('No priority', 'Sem prioridade')}</option>
              {priorities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <select
              value={pr.manualStage || ''}
              onChange={(e) =>
                onPatchPr(pr.prKey, { manualStage: e.target.value || null })
              }
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium focus:outline-none ${stageMeta.border} ${stageMeta.bg} ${stageMeta.accent}`}
            >
              <option value="" className="bg-zinc-900 text-zinc-200">
                {t(
                  `Auto Stage (${getStageMeta(pr.autoStage, lang).label})`,
                  `Estágio Auto (${getStageMeta(pr.autoStage, lang).label})`
                )}
              </option>
              {[...stages, archivedStage].map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100">
                  Manual: {s.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => copyQuick('review', `/review ${pr.url}`)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              {copiedBtn === 'review' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-indigo-400" />
              )}
              {t('Copy /review', 'Copiar /review')}
            </button>

            <button
              type="button"
              onClick={() => copyQuick('checkout', getCheckoutCommand(pr))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              {copiedBtn === 'checkout' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              )}
              {pr.localWorktree
                ? t('Copy cd worktree', 'Copiar cd worktree')
                : t('Copy gh checkout', 'Copiar gh checkout')}
            </button>

            <button
              type="button"
              onClick={() => copyQuick('prompt', buildAgentPrompt(pr, details, lang))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              {copiedBtn === 'prompt' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {t('Agent Prompt', 'Prompt p/ Agente')}
            </button>

            <button
              type="button"
              onClick={() => copyQuick('discord', formatDiscordPrLine(pr, true))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              {copiedBtn === 'discord' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Send className="h-3.5 w-3.5 text-indigo-400" />
              )}
              {t('Discord Line', 'Linha Discord')}
            </button>
          </div>

          {/* Ações diretas no GitHub */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {pr.isDraft && pr.role === 'author' && (
              <button
                type="button"
                disabled={Boolean(ghActionLoading)}
                onClick={() => triggerGhAction('ready')}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                <Rocket className="h-3 w-3" />
                {ghActionLoading === 'ready'
                  ? t('Publishing...', 'Publicando...')
                  : t('Mark Ready (Publish PR)', 'Publicar PR (Ready)')}
              </button>
            )}

            {pr.role === 'author' && pr.humanReviewers?.length > 0 && (
              <button
                type="button"
                disabled={Boolean(ghActionLoading)}
                onClick={() =>
                  triggerGhAction('re_review', {
                    reviewers: pr.humanReviewers.map((r) => r.login),
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-sky-500/35 bg-sky-500/15 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
              >
                <BellRing className="h-3 w-3" />
                {ghActionLoading === 're_review'
                  ? t('Requesting...', 'Solicitando...')
                  : `${t('Request Re-review', 'Pedir Re-review')} (${pr.humanReviewers.map((r) => `@${r.login}`).join(', ')})`}
              </button>
            )}

            {pr.localWorktree && (
              <button
                type="button"
                disabled={Boolean(rebaseLoading)}
                onClick={() => handleLocalRebase('rebase')}
                title={`${t('Execute git fetch & rebase in local worktree', 'Executar git fetch e rebase na worktree local')}: ${pr.localWorktree.path}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
              >
                {rebaseLoading === 'rebase' ? (
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-300" />
                ) : (
                  <Zap className="h-3 w-3 text-cyan-300" />
                )}
                {rebaseLoading === 'rebase'
                  ? t('Rebasing local...', 'Rebaseando local...')
                  : t('Local Rebase (1-Click)', 'Rebase Local (1 clique)')}
              </button>
            )}

            {pr.hasConflict && (
              <>
                <button
                  type="button"
                  disabled={Boolean(ghActionLoading)}
                  onClick={() => triggerGhAction('update_branch')}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  {ghActionLoading === 'update_branch'
                    ? t('Updating...', 'Atualizando...')
                    : 'Update Branch (GitHub)'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyQuick(
                      'rebase',
                      `git fetch origin ${pr.baseRefName} && git rebase origin/${pr.baseRefName}`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                >
                  {copiedBtn === 'rebase' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Terminal className="h-3 w-3 text-amber-400" />
                  )}
                  {t('Copy git rebase', 'Copiar git rebase')}
                </button>
              </>
            )}
          </div>

          {rebaseFeedback && (
            <div
              className={`mt-2.5 rounded-xl border p-2.5 text-xs ${
                rebaseFeedback.ok
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : rebaseFeedback.status === 'conflict'
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                  : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {rebaseFeedback.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    <span>{rebaseFeedback.message}</span>
                  </div>

                  {rebaseFeedback.newHead && (
                    <p className="font-mono text-[11px] text-emerald-300">
                      HEAD: {rebaseFeedback.newHead}
                    </p>
                  )}

                  {rebaseFeedback.conflictedFiles?.length > 0 && (
                    <div className="mt-1">
                      <p className="text-[11px] font-medium text-rose-300">
                        {t('Conflicted files:', 'Arquivos com conflito:')}
                      </p>
                      <ul className="mt-0.5 list-disc pl-4 font-mono text-[10px]">
                        {rebaseFeedback.conflictedFiles.map((file) => (
                          <li key={file}>{file}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setRebaseFeedback(null)}
                  className="rounded p-0.5 text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Botões contextuais após ação de rebase */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {rebaseFeedback.ok && (
                  <button
                    type="button"
                    disabled={Boolean(rebaseLoading)}
                    onClick={() => handleLocalRebase('push')}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
                  >
                    {rebaseLoading === 'push' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Rocket className="h-3 w-3" />
                    )}
                    Push (--force-with-lease)
                  </button>
                )}

                {rebaseFeedback.canAbort && (
                  <button
                    type="button"
                    disabled={Boolean(rebaseLoading)}
                    onClick={() => handleLocalRebase('abort')}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/30"
                  >
                    {rebaseLoading === 'abort' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {t('Abort Rebase', 'Abortar Rebase')}
                  </button>
                )}
              </div>
            </div>
          )}

          {ghActionFeedback && (
            <div
              className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                ghActionFeedback.ok
                  ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
                  : 'border-rose-500/35 bg-rose-500/15 text-rose-200'
              }`}
            >
              {ghActionFeedback.text}
            </div>
          )}

          {pr.humanReviewers?.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">
                {t('Reviewers:', 'Revisores:')}
              </span>
              {pr.humanReviewers.map((rev) => {
                const meta = getReviewerBadgeMeta(rev, lang);
                if (!meta || !meta.shouldShow) return null;
                return (
                  <span
                    key={rev.login}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}
                  >
                    @{rev.login} {meta.symbol} · {meta.label}
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1 font-mono">
              <GitBranch className="h-3 w-3 text-zinc-500" />
              {pr.headRefName} → {pr.baseRefName}
            </span>
            {pr.localWorktree && (
              <span className="inline-flex items-center gap-1 font-mono text-cyan-300">
                <Laptop className="h-3 w-3" />
                {pr.localWorktree.path}
              </span>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 border-b border-white/10 bg-zinc-950/60 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'plan'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('Plan, Checklist & Notes', 'Plano, Checklist & Notas')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('threads')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'threads'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Threads & Reviews
            {details && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
                {openThreads.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checks')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'checks'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('CI Checks & Description', 'Checks CI & Descrição')}
            {details && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
                {details.checks.length}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'plan' && (
            <div className="space-y-6">
              {/* Diagnóstico */}
              <div className={`rounded-2xl border p-3.5 ${stageMeta.border} ${stageMeta.bg}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${stageMeta.accent}`}>
                    {t('Auto diagnosis', 'Diagnóstico automático')}: {localizeBackendText(pr.actionReason, lang)}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {localizeBackendText(pr.sla?.detail, lang)}
                  </span>
                </div>
              </div>

              {/* Relação CodeRabbit vs Último Commit */}
              {(() => {
                const crSync =
                  details?.codeRabbitCommitSync ?? pr.codeRabbitCommitSync;
                const crPendingCount =
                  details?.codeRabbitPendingCount ?? pr.codeRabbitPendingCount ?? 0;
                const crSyncMeta = getCodeRabbitSyncMeta(crSync, crPendingCount, lang);
                if (!crSyncMeta) return null;
                return (
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-xs ${crSyncMeta.className}`}
                  >
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <Bot className="h-3.5 w-3.5 shrink-0" />
                      {crSyncMeta.label}
                    </span>
                    <span className="text-[11px] opacity-85">
                      {crSyncMeta.detail}
                    </span>
                  </div>
                );
              })()}

              {/* CodeRabbit pendente de resposta */}
              {(() => {
                const crThreads =
                  details?.codeRabbitPendingThreads ?? pr.codeRabbitPendingThreads ?? [];
                const crCount =
                  details?.codeRabbitPendingCount ??
                  pr.codeRabbitPendingCount ??
                  crThreads.length;
                if (!crCount) return null;
                return (
                  <div className="rounded-2xl border border-violet-500/35 bg-violet-500/10 p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200">
                        <Bot className="h-4 w-4 text-violet-300" />
                        {t(
                          `CodeRabbit awaiting reply (${crCount})`,
                          `CodeRabbit aguardando resposta (${crCount})`
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setHideBots(false);
                          setActiveTab('threads');
                        }}
                        className="text-[11px] font-medium text-violet-300 hover:text-violet-100"
                      >
                        {t('View in threads →', 'Ver nas threads →')}
                      </button>
                    </div>
                    {crThreads.length > 0 && (
                      <div className="space-y-1.5">
                        {crThreads.slice(0, 6).map((thread, idx) => (
                          <div
                            key={thread.id || `${thread.path}-${thread.line}-${idx}`}
                            className="rounded-xl border border-violet-500/20 bg-zinc-950/60 px-2.5 py-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="truncate font-mono text-violet-300">
                                {thread.path}
                                {thread.line ? `:${thread.line}` : ''}
                                {thread.isOutdated ? ' · outdated' : ''}
                              </span>
                              {thread.url && (
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-zinc-400 hover:text-white"
                                >
                                  {t('Open ↗', 'Abrir ↗')}
                                </a>
                              )}
                            </div>
                            {thread.excerpt && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-zinc-300">
                                {thread.excerpt}
                              </p>
                            )}
                          </div>
                        ))}
                        {crThreads.length > 6 && (
                          <p className="text-[11px] text-violet-300/80">
                            {t(
                              `+ ${crThreads.length - 6} more pending comment(s)`,
                              `+ ${crThreads.length - 6} outro(s) comentário(s) pendente(s)`
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tags */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {t('Organization Tags', 'Tags de Organização')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {customTags.map((tag) => {
                    const active = (pr.tags || []).includes(tag.id);
                    const style = getTagStyle(tag.color);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? `${style.pill} ring-1 ring-white/30`
                            : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                        }`}
                      >
                        {localizeTagLabel(tag, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checklist */}
              <div>
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {t('To do on this PR', 'O que fazer nesta PR')}
                  </h3>
                  <div className="flex items-center gap-2">
                    {(pr.checklist || []).some((i) => i.done) && (
                      <button
                        type="button"
                        onClick={clearDoneTasks}
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        {t('Clear completed', 'Limpar concluídas')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSuggestChecklist}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-500/25"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('Suggest steps', 'Sugerir passos')}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddChecklistItem} className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder={t(
                      'e.g. Run local tests or review changes...',
                      'Ex: Rodar testes locais ou revisar alterações...'
                    )}
                    className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('Add', 'Adicionar')}
                  </button>
                </form>

                <div className="space-y-1.5">
                  {(pr.checklist || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">
                      {lang === 'en' ? (
                        <>
                          No tasks yet. Click <strong>Suggest steps</strong> or add one manually.
                        </>
                      ) : (
                        <>
                          Nenhuma tarefa ainda. Clique em <strong>Sugerir passos</strong> ou adicione manualmente.
                        </>
                      )}
                    </div>
                  ) : (
                    pr.checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2"
                      >
                        <label className="flex flex-1 cursor-pointer items-start gap-2.5 text-xs">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleTask(item.id)}
                            className="mt-0.5 rounded border-white/20 bg-zinc-950 text-indigo-500"
                          />
                          <span
                            className={
                              item.done
                                ? 'text-zinc-500 line-through'
                                : 'text-zinc-200'
                            }
                          >
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeTask(item.id)}
                          className="text-zinc-500 hover:text-rose-400"
                          title={t('Remove item', 'Remover item')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notas Pessoais */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {t('Personal Notes', 'Notas Pessoais')}
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {saveBadge === 'saving' && t('Saving...', 'Salvando...')}
                    {saveBadge === 'saved' && t('Saved to disk', 'Salvo em disco')}
                    {saveBadge === 'error' && t('Save error', 'Erro ao salvar')}
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder={t(
                    'Notes about context, review decisions, useful commands, dependencies...',
                    'Anotações sobre contexto, decisões de review, comandos úteis, dependências...'
                  )}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3 text-xs leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'threads' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  {t(
                    `${resolvedThreadsCount} thread(s) already resolved on GitHub`,
                    `${resolvedThreadsCount} thread(s) já resolvidas no GitHub`
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setHideBots((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    hideBots
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200'
                      : 'border-white/10 bg-zinc-900 text-zinc-300'
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {hideBots
                    ? t('Hiding bots', 'Ocultando bots')
                    : t('Showing bots too', 'Mostrando bots também')}
                </button>
              </div>

              {detailsLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-xs text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  {t('Loading threads and reviews from GitHub...', 'Carregando threads e reviews do GitHub...')}
                </div>
              )}

              {detailsError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                  {t('Failed to load details', 'Falha ao carregar detalhes')}: {detailsError}
                </div>
              )}

              {!detailsLoading && details && (
                <>
                  {hideBots && (details.codeRabbitPendingCount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setHideBots(false)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-left text-xs text-violet-200 transition hover:bg-violet-500/20"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-violet-300" />
                        {t(
                          `${details.codeRabbitPendingCount} CodeRabbit review(s) awaiting reply (hidden by bot filter)`,
                          `${details.codeRabbitPendingCount} review(s) do CodeRabbit aguardando resposta (oculto pelo filtro de bots)`
                        )}
                      </span>
                      <span className="shrink-0 font-medium text-violet-300">
                        {t('Show bots', 'Mostrar bots')}
                      </span>
                    </button>
                  )}

                  {/* Threads não resolvidas */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t(`Open Code Threads (${openThreads.length})`, `Threads de Código Abertas (${openThreads.length})`)}
                    </h4>
                    {openThreads.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-xs text-zinc-500">
                        {t('No open threads with the current filter.', 'Nenhuma thread aberta com o filtro atual.')}
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {openThreads.map((thread) => {
                          const first = thread.comments[0];
                          return (
                            <div
                              key={thread.id}
                              className="rounded-xl border border-white/10 bg-zinc-900/80 p-3"
                            >
                              <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                                <span className="truncate font-mono text-indigo-300">
                                  {thread.path || t('file', 'arquivo')}
                                  {thread.line ? `:${thread.line}` : ''}
                                </span>
                                {first?.url && (
                                  <a
                                    href={first.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 text-zinc-400 hover:text-white"
                                  >
                                    {t('View thread ↗', 'Ver thread ↗')}
                                  </a>
                                )}
                              </div>
                              {thread.comments.map((c) => (
                                <div
                                  key={c.id}
                                  className="mt-2 border-t border-white/5 pt-2 first:mt-0 first:border-0 first:pt-0"
                                >
                                  <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-400">
                                    <span className="font-semibold text-zinc-200">
                                      @{c.author}
                                    </span>
                                    {c.isBot && (
                                      <span className="rounded bg-violet-500/20 px-1.5 py-0.2 text-[10px] text-violet-300">
                                        bot
                                      </span>
                                    )}
                                    <span>{formatRelativeTime(c.createdAt, lang)}</span>
                                  </div>
                                  <p className="whitespace-pre-wrap break-words text-xs text-zinc-300">
                                    {c.body.slice(0, 600)}
                                    {c.body.length > 600 ? '...' : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reviews e Comentários */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t(
                        `Reviews & Comments (${visibleReviews.length + visibleComments.length})`,
                        `Reviews & Comentários (${visibleReviews.length + visibleComments.length})`
                      )}
                    </h4>
                    <div className="space-y-2">
                      {[...visibleReviews, ...visibleComments]
                        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-white/10 bg-zinc-900/60 p-3"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3 w-3 text-zinc-500" />
                                <span className="font-semibold text-zinc-200">
                                  @{entry.author}
                                </span>
                                {entry.state && (
                                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">
                                    {entry.state}
                                  </span>
                                )}
                                <span className="text-zinc-500">
                                  {formatRelativeTime(entry.createdAt, lang)}
                                </span>
                              </div>
                              {entry.url && (
                                <a
                                  href={entry.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-zinc-400 hover:text-white"
                                >
                                  {t('Open ↗', 'Abrir ↗')}
                                </a>
                              )}
                            </div>
                            {entry.body && (
                              <p className="whitespace-pre-wrap break-words text-xs text-zinc-300">
                                {entry.body.slice(0, 600)}
                                {entry.body.length > 600 ? '...' : ''}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'checks' && (
            <div className="space-y-5">
              {detailsLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-xs text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  {t('Loading checks from latest commit...', 'Carregando checks do último commit...')}
                </div>
              )}

              {!detailsLoading && details && (
                <>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t(`CI Checks (${sortedChecks.length})`, `Checks do CI (${sortedChecks.length})`)}
                    </h4>
                    {sortedChecks.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-xs text-zinc-500">
                        {t('No checks recorded on latest commit.', 'Nenhum check registrado no último commit.')}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {sortedChecks.map((chk, idx) => {
                          const isFail =
                            chk.conclusion === 'FAILURE' ||
                            chk.conclusion === 'ERROR' ||
                            chk.conclusion === 'TIMED_OUT';
                          const isPass = chk.conclusion === 'SUCCESS';
                          return (
                            <div
                              key={`${chk.name}-${idx}`}
                              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2 text-xs"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                {isPass ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                ) : isFail ? (
                                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                                ) : (
                                  <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                                )}
                                <span className="truncate font-medium text-zinc-200">
                                  {chk.name}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-[11px] text-zinc-400">
                                  {chk.conclusion || chk.status}
                                </span>
                                {chk.url && (
                                  <a
                                    href={chk.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-300 hover:underline"
                                  >
                                    Log ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t('PR Description', 'Descrição da PR')}
                    </h4>
                    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5 text-xs leading-relaxed text-zinc-300">
                      {details.body?.trim() ? (
                        <pre className="whitespace-pre-wrap break-words font-sans">
                          {details.body}
                        </pre>
                      ) : (
                        <span className="text-zinc-500">
                          {t('No description.', 'Sem descrição.')}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
