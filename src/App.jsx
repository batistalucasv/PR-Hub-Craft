import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  batchPatchPrs,
  deleteTag,
  fetchPrs,
  patchPrState,
  saveTag,
} from './api.js';
import { THEMES, sortPrs } from './utils/prHelpers.js';
import { localizeBackendText, useI18n } from './i18n.jsx';
import Header from './components/Header.jsx';
import StatsBar from './components/StatsBar.jsx';
import FilterBar from './components/FilterBar.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import PrTableView from './components/PrTableView.jsx';
import FocusQueueView from './components/FocusQueueView.jsx';
import DiscordExportView from './components/DiscordExportView.jsx';
import PrDetailDrawer from './components/PrDetailDrawer.jsx';
import TagManagerModal from './components/TagManagerModal.jsx';

const INITIAL_FILTERS = {
  role: 'all',
  repo: 'all',
  reviewer: 'all',
  priority: 'all',
  workStatus: 'all',
  tagId: 'all',
  onlyWorktree: false,
  onlySlaAlert: false,
  onlyQuickWins: false,
  showArchived: false,
  quickStage: null,
  sortBy: 'smart',
};

const DISMISSED_NOTIFS_STORAGE_KEY = 'pr-hub-craft-dismissed-notifs';

function loadDismissedNotifIds() {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveDismissedNotifIds(idSet) {
  try {
    const list = Array.from(idSet).slice(-500);
    localStorage.setItem(DISMISSED_NOTIFS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

function buildActionableAlerts(prs = [], lang = 'en') {
  const en = lang === 'en';
  const alerts = [];
  const now = new Date().toISOString();

  for (const pr of prs) {
    if (pr.stage === 'arquivado') continue;

    if (
      (pr.stage === 'revisar' || pr.stage === 'resolver_feedback') &&
      pr.role === 'author' &&
      (pr.humanFeedbackCount || 0) > 0
    ) {
      alerts.push({
        id: `alert-feedback-${pr.prKey}-${pr.humanFeedbackCount}`,
        prKey: pr.prKey,
        at: pr.updatedAt || now,
        kind: 'action',
        message: en
          ? `💬 Pending human feedback on #${pr.number}: ${pr.title.slice(0, 48)}`
          : `💬 Feedback humano pendente em #${pr.number}: ${pr.title.slice(0, 48)}`,
      });
    }

    if (pr.stage === 'revisar' && pr.role !== 'author') {
      alerts.push({
        id: `alert-revisar-${pr.prKey}-${pr.updatedAt || 'open'}`,
        prKey: pr.prKey,
        at: pr.updatedAt || now,
        kind: 'action',
        message: en
          ? `👀 Waiting for your review on #${pr.number}: ${pr.title.slice(0, 48)}`
          : `👀 Aguardando sua revisão em #${pr.number}: ${pr.title.slice(0, 48)}`,
      });
    }

    if (pr.hasCiFailure || pr.stage === 'problema' || pr.stage === 'corrigir_conflito_ci') {
      alerts.push({
        id: `alert-ci-${pr.prKey}-${pr.ciState || 'fail'}`,
        prKey: pr.prKey,
        at: pr.updatedAt || now,
        kind: 'action',
        message: en
          ? `🔴 Issue/CI failing on #${pr.number}: ${pr.title.slice(0, 48)}`
          : `🔴 Problema/CI falhando em #${pr.number}: ${pr.title.slice(0, 48)}`,
      });
    }

    if (['warning_7d', 'overdue_7d', 'overdue_14d', 'danger_30d'].includes(pr.sla?.status)) {
      alerts.push({
        id: `alert-sla-${pr.prKey}-${pr.sla.status}`,
        prKey: pr.prKey,
        at: pr.updatedAt || now,
        kind: 'action',
        message: en
          ? `⏰ SLA (${localizeBackendText(pr.sla.label, lang)}) on #${pr.number}: ${pr.title.slice(0, 48)}`
          : `⏰ SLA (${pr.sla.label}) em #${pr.number}: ${pr.title.slice(0, 48)}`,
      });
    }
  }

  return alerts;
}

function detectPrChanges(prevPrs = [], nextPrs = [], lang = 'en') {
  if (!prevPrs.length) return [];
  const en = lang === 'en';
  const prevMap = new Map(prevPrs.map((p) => [p.prKey, p]));
  const events = [];
  const now = new Date().toISOString();

  for (const next of nextPrs) {
    const prev = prevMap.get(next.prKey);
    if (!prev) {
      events.push({
        id: `${next.prKey}-new-${Date.now()}`,
        prKey: next.prKey,
        at: now,
        message: en
          ? `New PR detected: #${next.number} ${next.title.slice(0, 55)}`
          : `Nova PR detectada: #${next.number} ${next.title.slice(0, 55)}`,
      });
      continue;
    }

    if (prev.ciState !== next.ciState && (next.ciState === 'SUCCESS' || next.ciState === 'FAILURE')) {
      events.push({
        id: `${next.prKey}-ci-${Date.now()}`,
        prKey: next.prKey,
        at: now,
        message:
          next.ciState === 'SUCCESS'
            ? en
              ? `🟢 CI turned green on #${next.number}`
              : `🟢 CI ficou verde em #${next.number}`
            : en
              ? `🔴 CI failed on #${next.number}`
              : `🔴 CI falhou em #${next.number}`,
      });
    }

    if (prev.hasConflict !== next.hasConflict) {
      events.push({
        id: `${next.prKey}-conf-${Date.now()}`,
        prKey: next.prKey,
        at: now,
        message: next.hasConflict
          ? en
            ? `⚠️ Merge conflict detected on #${next.number}`
            : `⚠️ Conflito de merge detectado em #${next.number}`
          : en
            ? `✅ Conflict resolved on #${next.number}`
            : `✅ Conflito resolvido em #${next.number}`,
      });
    }

    if (prev.humanFeedbackCount < next.humanFeedbackCount || prev.reviewDecision !== next.reviewDecision) {
      events.push({
        id: `${next.prKey}-rev-${Date.now()}`,
        prKey: next.prKey,
        at: now,
        message: en
          ? `💬 New human activity/review on #${next.number}`
          : `💬 Nova atividade/review humano em #${next.number}`,
      });
    }

    if ((prev.codeRabbitPendingCount || 0) < (next.codeRabbitPendingCount || 0)) {
      events.push({
        id: `${next.prKey}-cr-${Date.now()}`,
        prKey: next.prKey,
        at: now,
        message: en
          ? `🤖 ${next.codeRabbitPendingCount} CodeRabbit review(s) awaiting reply on #${next.number}`
          : `🤖 ${next.codeRabbitPendingCount} review(s) do CodeRabbit aguardando resposta em #${next.number}`,
      });
    }
  }

  return events;
}

function computeStats(prs) {
  return {
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
  };
}

function isUrgentState(priority, slaStatus) {
  return (
    priority === 'P0' ||
    priority === 'P1' ||
    ['overdue_7d', 'overdue_14d', 'danger_30d'].includes(slaStatus)
  );
}

function matchesFilterBar(pr, filters, searchLower) {
  if (!filters.showArchived && pr.stage === 'arquivado') return false;

  if (filters.role === 'author' && pr.role !== 'author') return false;
  if (filters.role === 'not_author' && pr.role === 'author') return false;

  if (filters.repo !== 'all' && pr.repo !== filters.repo) {
    return false;
  }

  if (filters.priority === 'none' && pr.priority) return false;
  if (
    filters.priority !== 'all' &&
    filters.priority !== 'none' &&
    pr.priority !== filters.priority
  ) {
    return false;
  }

  if (filters.workStatus === 'none' && pr.workStatus) return false;
  if (
    filters.workStatus !== 'all' &&
    filters.workStatus !== 'none' &&
    pr.workStatus !== filters.workStatus
  ) {
    return false;
  }

  if (filters.tagId !== 'all' && !(pr.tags || []).includes(filters.tagId)) {
    return false;
  }

  if (filters.onlyWorktree && !pr.localWorktree) return false;

  if (filters.onlyQuickWins && !pr.isQuickWinConflict) return false;

  if (
    filters.reviewer !== 'all' &&
    !(pr.humanReviewers || []).some((r) => r.login === filters.reviewer)
  ) {
    return false;
  }

  if (
    filters.onlySlaAlert &&
    !['warning_7d', 'overdue_7d', 'overdue_14d', 'danger_30d'].includes(
      pr.sla?.status
    )
  ) {
    return false;
  }

  if (searchLower) {
    const hay = `${pr.repo} #${pr.number} ${pr.title} ${pr.headRefName} ${pr.author?.login}`.toLowerCase();
    if (!hay.includes(searchLower)) return false;
  }

  return true;
}

function applyOptimisticPatch(pr, patch) {
  const next = { ...pr };
  if ('priority' in patch) {
    next.priority = patch.priority;
    const currentTags = Array.isArray(next.tags) ? [...next.tags] : [];
    const manual = Array.isArray(next.manualTags) ? next.manualTags : [];
    if (isUrgentState(next.priority, next.sla?.status)) {
      if (!currentTags.includes('urgente')) currentTags.push('urgente');
      next.tags = currentTags;
    } else if (!manual.includes('urgente')) {
      next.tags = currentTags.filter((t) => t !== 'urgente');
    }
  }
  if ('workStatus' in patch) {
    next.workStatus = patch.workStatus ?? null;
  }
  if ('manualStage' in patch) {
    next.manualStage = patch.manualStage;
    next.stage = patch.manualStage || next.autoStage;
  }
  if ('selectedForToday' in patch) {
    next.selectedForToday = Boolean(patch.selectedForToday);
  }
  if ('tags' in patch && Array.isArray(patch.tags)) {
    next.tags = patch.tags;
  }
  if ('addTag' in patch) {
    const current = Array.isArray(next.tags) ? next.tags : [];
    if (!current.includes(patch.addTag)) {
      next.tags = [...current, patch.addTag];
    }
    const manual = Array.isArray(next.manualTags) ? next.manualTags : [];
    if (!manual.includes(patch.addTag)) {
      next.manualTags = [...manual, patch.addTag];
    }
  }
  if ('removeTag' in patch) {
    next.tags = (next.tags || []).filter((t) => t !== patch.removeTag);
    next.manualTags = (next.manualTags || []).filter((t) => t !== patch.removeTag);
  }
  if ('notes' in patch) next.notes = patch.notes;
  if ('checklist' in patch) next.checklist = patch.checklist;
  if ('discordSentAt' in patch) next.discordSentAt = patch.discordSentAt;
  return next;
}

export default function App() {
  const { lang, t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [activePrKey, setActivePrKey] = useState(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('pr-hub-craft-theme') || 'graphite';
    } catch {
      return 'graphite';
    }
  });

  const searchInputRef = useRef(null);
  const prevPrsRef = useRef([]);
  const dismissedNotifIdsRef = useRef(null);
  if (dismissedNotifIdsRef.current === null) {
    dismissedNotifIdsRef.current = loadDismissedNotifIds();
  }

  useEffect(() => {
    const themeMeta = THEMES.find((t) => t.id === theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute(
      'data-color-mode',
      themeMeta?.mode || 'dark'
    );
    try {
      localStorage.setItem('pr-hub-craft-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  async function load(refresh = false, { silent = false } = {}) {
    if (refresh && !silent) setSyncing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError(null);

    try {
      const payload = await fetchPrs(refresh);
      const nextPrs = payload.prs || [];
      const diffEvents =
        prevPrsRef.current.length > 0 && refresh
          ? detectPrChanges(prevPrsRef.current, nextPrs, lang)
          : [];
      const actionableAlerts = buildActionableAlerts(nextPrs, lang);
      const dismissed = dismissedNotifIdsRef.current || new Set();

      setNotifications((prev) => {
        const prevDiffs = prev.filter((n) => !String(n.id).startsWith('alert-'));
        const combined = [...diffEvents, ...prevDiffs, ...actionableAlerts];
        const seen = new Set();
        const filtered = [];
        for (const item of combined) {
          if (dismissed.has(item.id) || seen.has(item.id)) continue;
          seen.add(item.id);
          filtered.push(item);
        }
        return filtered.slice(0, 30);
      });

      prevPrsRef.current = nextPrs;
      setData(payload);
    } catch (err) {
      if (!silent) setError(err.message || t('Error loading PRs', 'Erro ao carregar PRs'));
    } finally {
      if (!silent) {
        setLoading(false);
        setSyncing(false);
      }
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  // Auto-Sync em background a cada 5 minutos
  useEffect(() => {
    if (!autoSyncEnabled) return undefined;
    const id = setInterval(() => {
      load(true, { silent: true });
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoSyncEnabled]);

  // Atalho de teclado '/' para focar na busca
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleDismissNotification(notifId) {
    if (!notifId) return;
    if (dismissedNotifIdsRef.current) {
      dismissedNotifIdsRef.current.add(notifId);
      saveDismissedNotifIds(dismissedNotifIdsRef.current);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  }

  function handleClearNotifications() {
    if (dismissedNotifIdsRef.current) {
      for (const n of notifications) {
        dismissedNotifIdsRef.current.add(n.id);
      }
      saveDismissedNotifIds(dismissedNotifIdsRef.current);
    }
    setNotifications([]);
  }

  function handleSelectQuickFilter(quickId) {
    setFilters((prev) => ({ ...prev, quickStage: quickId }));
    if (quickId === 'focus') {
      setViewMode('focus');
    } else if (quickId && viewMode === 'focus') {
      setViewMode('table');
    }
  }

  async function handlePatchPr(prKey, patch) {
    setData((prev) => {
      if (!prev) return prev;
      const prs = prev.prs.map((p) =>
        p.prKey === prKey ? applyOptimisticPatch(p, patch) : p
      );
      return { ...prev, prs, stats: computeStats(prs) };
    });

    try {
      await patchPrState(prKey, patch);
    } catch (err) {
      setError(`Erro ao salvar alteração: ${err.message}`);
      load(false);
      throw err;
    }
  }

  async function handleBatchPatch(prKeys, patch) {
    const keySet = new Set(prKeys);
    setData((prev) => {
      if (!prev) return prev;
      const prs = prev.prs.map((p) =>
        keySet.has(p.prKey) ? applyOptimisticPatch(p, patch) : p
      );
      return { ...prev, prs, stats: computeStats(prs) };
    });

    try {
      await batchPatchPrs(prKeys, patch);
    } catch (err) {
      setError(`Erro ao salvar alterações em lote: ${err.message}`);
      load(false);
    }
  }

  async function handleSaveTag(tag) {
    const res = await saveTag(tag);
    setData((prev) => (prev ? { ...prev, customTags: res.customTags } : prev));
  }

  async function handleDeleteTag(tagId) {
    const res = await deleteTag(tagId);
    setData((prev) => {
      if (!prev) return prev;
      const prs = prev.prs.map((p) => ({
        ...p,
        tags: (p.tags || []).filter((t) => t !== tagId),
      }));
      return { ...prev, customTags: res.customTags, prs };
    });
  }

  const repoCounts = useMemo(() => {
    const map = new Map();
    for (const pr of data?.prs || []) {
      if (!filters.showArchived && pr.stage === 'arquivado') continue;
      map.set(pr.repo, (map.get(pr.repo) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([repo, count]) => ({ repo, count }))
      .sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo));
  }, [data?.prs, filters.showArchived]);

  const repositories = useMemo(
    () => repoCounts.map((item) => item.repo),
    [repoCounts]
  );

  const reviewers = useMemo(() => {
    const map = new Map();
    for (const pr of data?.prs || []) {
      if (!filters.showArchived && pr.stage === 'arquivado') continue;
      for (const rev of pr.humanReviewers || []) {
        map.set(rev.login, (map.get(rev.login) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([login, count]) => ({ login, count }))
      .sort((a, b) => b.count - a.count || a.login.localeCompare(b.login));
  }, [data?.prs, filters.showArchived]);

  const quickWinCount = useMemo(() => {
    return (data?.prs || []).filter(
      (pr) => pr.isQuickWinConflict && (filters.showArchived || pr.stage !== 'arquivado')
    ).length;
  }, [data?.prs, filters.showArchived]);

  const readyForDiscordCount = useMemo(() => {
    return (data?.prs || []).filter(
      (pr) =>
        pr.role === 'author' &&
        !pr.hasConflict &&
        !pr.hasCiFailure &&
        !pr.isDraft &&
        pr.stage !== 'arquivado'
    ).length;
  }, [data?.prs]);

  const { tagCounts, tagTotalCount, workStatusCounts } = useMemo(() => {
    const counts = {};
    const wsCounts = { executando: 0, parado: 0, terminado: 0, none: 0 };
    let total = 0;
    for (const pr of data?.prs || []) {
      if (!filters.showArchived && pr.stage === 'arquivado') continue;
      total += 1;
      for (const tagId of pr.tags || []) {
        counts[tagId] = (counts[tagId] || 0) + 1;
      }
      if (pr.workStatus && wsCounts[pr.workStatus] !== undefined) {
        wsCounts[pr.workStatus] += 1;
      } else {
        wsCounts.none += 1;
      }
    }
    return { tagCounts: counts, tagTotalCount: total, workStatusCounts: wsCounts };
  }, [data?.prs, filters.showArchived]);

  const scopedStats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const all = (data?.prs || []).filter((pr) =>
      matchesFilterBar(pr, filters, q)
    );
    return computeStats(all);
  }, [data?.prs, filters, searchQuery]);

  const filteredPrs = useMemo(() => {
    const all = data?.prs || [];
    const q = searchQuery.trim().toLowerCase();

    const matched = all.filter((pr) => {
      if (!matchesFilterBar(pr, filters, q)) return false;

      if (filters.quickStage === 'focus') {
        if (!pr.selectedForToday) return false;
      } else if (filters.quickStage === 'problema') {
        if (pr.stage !== 'problema' && pr.stage !== 'corrigir_conflito_ci') return false;
      } else if (filters.quickStage === 'revisar') {
        if (pr.stage !== 'revisar' && pr.stage !== 'resolver_feedback') return false;
      } else if (filters.quickStage === 'finalizado') {
        if (pr.stage !== 'finalizado' && pr.stage !== 'finalizar') return false;
      } else if (filters.quickStage === 'revisado') {
        if (pr.stage !== 'revisado' && pr.stage !== 'aguardando') return false;
      } else if (filters.quickStage) {
        if (pr.stage !== filters.quickStage) return false;
      }

      return true;
    });

    return sortPrs(matched, filters.sortBy);
  }, [data?.prs, filters, searchQuery]);

  const activePr = useMemo(
    () => (data?.prs || []).find((p) => p.prKey === activePrKey) || null,
    [data?.prs, activePrKey]
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-12">
      <Header
        viewer={data?.viewer}
        rateLimit={data?.rateLimit}
        syncedAt={data?.syncedAt}
        fromCache={data?.fromCache}
        syncing={syncing}
        onSync={() => load(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        onOpenTagModal={() => setTagModalOpen(true)}
        theme={theme}
        onThemeChange={setTheme}
        notifications={notifications}
        onDismissNotification={handleDismissNotification}
        onClearNotifications={handleClearNotifications}
        onOpenPrByKey={(prKey) => setActivePrKey(prKey)}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={() => setAutoSyncEnabled((v) => !v)}
        readyForDiscordCount={readyForDiscordCount}
      />

      {error && (
        <div className="mt-4 w-full px-3 sm:px-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-lg bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
            >
              {t('Close', 'Fechar')}
            </button>
          </div>
        </div>
      )}

      {loading && !data ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sm text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          <p>
            {t(
              'Fetching your Pull Requests via gh CLI and mapping local worktrees...',
              'Buscando suas Pull Requests via gh CLI e mapeando worktrees locais...'
            )}
          </p>
        </div>
      ) : (
        <>
          <StatsBar
            stats={scopedStats}
            activeQuickFilter={filters.quickStage}
            onSelectQuickFilter={handleSelectQuickFilter}
          />

          <FilterBar
            filters={filters}
            onChangeFilter={updateFilter}
            onResetFilters={() => {
              setFilters(INITIAL_FILTERS);
              setSearchQuery('');
            }}
            repositories={repositories}
            repoCounts={repoCounts}
            reviewers={reviewers}
            workStatusCounts={workStatusCounts}
            quickWinCount={quickWinCount}
            customTags={data?.customTags || []}
            tagCounts={tagCounts}
            tagTotalCount={tagTotalCount}
            totalFiltered={filteredPrs.length}
            totalAll={data?.prs?.length || 0}
          />

          {viewMode === 'kanban' && (
            <KanbanBoard
              prs={filteredPrs}
              customTags={data?.customTags || []}
              showArchived={filters.showArchived}
              onOpenDetail={(pr) => setActivePrKey(pr.prKey)}
              onPatchPr={handlePatchPr}
              onSelectRepo={(repo) =>
                updateFilter('repo', filters.repo === repo ? 'all' : repo)
              }
            />
          )}

          {viewMode === 'table' && (
            <PrTableView
              prs={filteredPrs}
              customTags={data?.customTags || []}
              onOpenDetail={(pr) => setActivePrKey(pr.prKey)}
              onPatchPr={handlePatchPr}
              onBatchPatch={handleBatchPatch}
              onSelectRepo={(repo) =>
                updateFilter('repo', filters.repo === repo ? 'all' : repo)
              }
            />
          )}

          {viewMode === 'focus' && (
            <FocusQueueView
              prs={filteredPrs}
              customTags={data?.customTags || []}
              onOpenDetail={(pr) => setActivePrKey(pr.prKey)}
              onPatchPr={handlePatchPr}
              onSelectRepo={(repo) =>
                updateFilter('repo', filters.repo === repo ? 'all' : repo)
              }
            />
          )}

          {viewMode === 'discord' && (
            <DiscordExportView
              prs={filteredPrs}
              onBatchPatch={handleBatchPatch}
              onPatchPr={handlePatchPr}
              onOpenDetail={(pr) => setActivePrKey(pr.prKey)}
            />
          )}
        </>
      )}

      <PrDetailDrawer
        pr={activePr}
        customTags={data?.customTags || []}
        onClose={() => setActivePrKey(null)}
        onPatchPr={handlePatchPr}
        onAfterGhAction={() => load(true, { silent: true })}
      />

      <TagManagerModal
        open={tagModalOpen}
        customTags={data?.customTags || []}
        onClose={() => setTagModalOpen(false)}
        onSaveTag={handleSaveTag}
        onDeleteTag={handleDeleteTag}
      />
    </div>
  );
}
