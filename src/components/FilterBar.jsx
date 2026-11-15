import React, { useState } from 'react';
import {
  Filter,
  FolderGit2,
  Laptop,
  AlarmClock,
  Archive,
  ArrowUpDown,
  RotateCcw,
  Zap,
  Users,
  ChevronDown,
  ChevronUp,
  Tags,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';
import { getPriorities, getWorkStatuses, getTagStyle } from '../utils/prHelpers.js';
import { localizeTagLabel, useI18n } from '../i18n.jsx';

export default function FilterBar({
  filters,
  onChangeFilter,
  onResetFilters,
  repositories,
  repoCounts = [],
  reviewers = [],
  workStatusCounts = {},
  quickWinCount = 0,
  customTags,
  tagCounts = {},
  tagTotalCount,
  totalFiltered,
  totalAll,
}) {
  const { lang, t } = useI18n();
  const priorities = getPriorities(lang);
  const workStatuses = getWorkStatuses(lang);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pr-hub-craft-filters-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pr-hub-craft-filters-collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const hasActiveFilters =
    filters.role !== 'all' ||
    filters.repo !== 'all' ||
    filters.reviewer !== 'all' ||
    filters.priority !== 'all' ||
    filters.workStatus !== 'all' ||
    filters.tagId !== 'all' ||
    filters.onlyWorktree ||
    filters.onlySlaAlert ||
    filters.onlyQuickWins ||
    filters.showArchived ||
    Boolean(filters.quickStage);

  const totalVisibleRepoPrs = repoCounts.reduce((acc, r) => acc + r.count, 0);

  const activeFilterList = [];
  if (filters.repo !== 'all') activeFilterList.push(`Repo: ${filters.repo}`);
  if (filters.role !== 'all') {
    activeFilterList.push(filters.role === 'author' ? t('My PRs', 'Minhas PRs') : t('Review/Involved', 'Revisar'));
  }
  if (filters.priority !== 'all') activeFilterList.push(`Prio: ${filters.priority}`);
  if (filters.reviewer !== 'all') activeFilterList.push(`@${filters.reviewer}`);
  if (filters.workStatus !== 'all') {
    const ws = workStatuses.find((w) => w.id === filters.workStatus);
    activeFilterList.push(`${t('Work', 'Trabalho')}: ${ws?.label || filters.workStatus}`);
  }
  if (filters.tagId !== 'all') {
    const tag = customTags?.find((tg) => tg.id === filters.tagId);
    activeFilterList.push(`Tag: ${tag ? localizeTagLabel(tag, lang) : filters.tagId}`);
  }
  if (filters.onlyQuickWins) activeFilterList.push(t('Rebase Only', 'Só Rebase'));
  if (filters.onlyWorktree) activeFilterList.push(t('Worktree', 'Worktree'));
  if (filters.onlySlaAlert) activeFilterList.push('SLA Alert');
  if (filters.showArchived) activeFilterList.push(t('Deferred', 'Adiadas'));

  return (
    <section className="w-full space-y-2 px-3 pt-3 sm:px-4">
      {/* Barra de Topo Modular: Toggle Minimizar/Expandir e Resumo */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/70 px-3.5 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
            <span>{t('Filters & Tags', 'Filtros & Tags')}</span>
          </div>

          <span className="text-xs text-zinc-600">·</span>
          <span className="font-mono text-xs text-zinc-400">
            {totalFiltered}/{totalAll} PRs
          </span>

          {activeFilterList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {activeFilterList.map((badge, i) => (
                <span
                  key={i}
                  className="rounded-md border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-200"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{t('Clear', 'Limpar')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            title={
              isCollapsed
                ? t('Expand filters menu', 'Expandir menu de filtros')
                : t('Minimize filters menu', 'Minimizar menu de filtros')
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/90 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-zinc-800 hover:text-white"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
                <span>{t('Expand menu', 'Expandir menu')}</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                <span>{t('Minimize menu', 'Minimizar menu')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-2.5">
          {/* Módulo 1: Repositórios */}
          {repoCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <FolderGit2 className="h-3.5 w-3.5 text-indigo-400" />
                {t('Repositories:', 'Repositórios:')}
              </span>

              <button
                type="button"
                onClick={() => onChangeFilter('repo', 'all')}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  filters.repo === 'all'
                    ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30'
                    : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                <span>{t('All', 'Todos')}</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
                  {totalVisibleRepoPrs}
                </span>
              </button>

              {repoCounts.map(({ repo, count }) => {
                const active = filters.repo === repo;
                return (
                  <button
                    key={repo}
                    type="button"
                    onClick={() => onChangeFilter('repo', active ? 'all' : repo)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30'
                        : 'border-white/10 bg-zinc-950/60 text-zinc-300 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="font-mono text-[11px]">{repo}</span>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-zinc-300">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Módulo 2: Filtros & Critérios */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-zinc-900/50 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Filter className="h-3.5 w-3.5" />
                {t('Filters:', 'Filtros:')}
              </span>

              {/* Relação */}
              <select
                value={filters.role}
                onChange={(e) => onChangeFilter('role', e.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-950/90 px-2.5 py-1 text-xs text-zinc-200 focus:border-indigo-500/60 focus:outline-none"
              >
                <option value="all">{t('All roles (@me)', 'Todas relações (@me)')}</option>
                <option value="author">{t('My PRs (Author)', 'Minhas PRs (Autor)')}</option>
                <option value="not_author">{t('To Review / Involved', 'Para Revisar / Envolvido')}</option>
              </select>

              {/* Repositório */}
              <select
                value={filters.repo}
                onChange={(e) => onChangeFilter('repo', e.target.value)}
                className="max-w-[220px] rounded-lg border border-white/10 bg-zinc-950/90 px-2.5 py-1 text-xs text-zinc-200 focus:border-indigo-500/60 focus:outline-none"
              >
                <option value="all">
                  {t(`All repositories (${repositories.length})`, `Todos repositórios (${repositories.length})`)}
                </option>
                {repositories.map((repo) => (
                  <option key={repo} value={repo}>
                    {repo}
                  </option>
                ))}
              </select>

              {/* Prioridade */}
              <select
                value={filters.priority}
                onChange={(e) => onChangeFilter('priority', e.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-950/90 px-2.5 py-1 text-xs text-zinc-200 focus:border-indigo-500/60 focus:outline-none"
              >
                <option value="all">{t('All priorities', 'Todas prioridades')}</option>
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                <option value="none">{t('No priority', 'Sem prioridade')}</option>
              </select>

              {/* Revisor Humano */}
              {reviewers.length > 0 && (
                <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-950/90 px-2 py-1">
                  <Users className="h-3.5 w-3.5 text-zinc-400" />
                  <select
                    value={filters.reviewer}
                    onChange={(e) => onChangeFilter('reviewer', e.target.value)}
                    className="max-w-[160px] bg-transparent text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="all" className="bg-zinc-900">
                      {t(`All reviewers (${reviewers.length})`, `Todos revisores (${reviewers.length})`)}
                    </option>
                    {reviewers.map((r) => (
                      <option key={r.login} value={r.login} className="bg-zinc-900">
                        @{r.login} ({r.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vitórias Rápidas (Só Rebase) */}
              <button
                type="button"
                onClick={() => onChangeFilter('onlyQuickWins', !filters.onlyQuickWins)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  filters.onlyQuickWins
                    ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-200'
                    : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
                title={t(
                  'PRs with conflict where CI is green and no review is pending (just rebase)',
                  'PRs com conflito onde o CI está verde e não há review pendente (só fazer rebase)'
                )}
              >
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                {t(`Rebase Only (${quickWinCount})`, `Só Rebase (${quickWinCount})`)}
              </button>

              {/* Worktree Local */}
              <button
                type="button"
                onClick={() => onChangeFilter('onlyWorktree', !filters.onlyWorktree)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  filters.onlyWorktree
                    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
                title={t(
                  'Show only PRs with an active local worktree',
                  'Mostrar apenas PRs com worktree ativa localmente'
                )}
              >
                <Laptop className="h-3.5 w-3.5" />
                {t('Local worktree', 'Worktree local')}
              </button>

              {/* Alerta SLA */}
              <button
                type="button"
                onClick={() => onChangeFilter('onlySlaAlert', !filters.onlySlaAlert)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  filters.onlySlaAlert
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                    : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
                title={t(
                  'Show only PRs waiting 5+ days for your response',
                  'Mostrar apenas PRs com 5+ dias aguardando sua resposta'
                )}
              >
                <AlarmClock className="h-3.5 w-3.5" />
                {t('SLA Alert', 'Alerta SLA')}
              </button>

              {/* Mostrar Arquivadas */}
              <button
                type="button"
                onClick={() => onChangeFilter('showArchived', !filters.showArchived)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  filters.showArchived
                    ? 'border-zinc-500/50 bg-zinc-700/40 text-zinc-200'
                    : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                {t('Deferred', 'Adiadas')}
              </button>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950/80 px-2 py-1 text-xs text-zinc-300">
                <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={filters.sortBy}
                  onChange={(e) => onChangeFilter('sortBy', e.target.value)}
                  className="bg-transparent text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="smart" className="bg-zinc-900">
                    {t('Smart Order', 'Ordem Inteligente')}
                  </option>
                  <option value="priority" className="bg-zinc-900">
                    {t('Priority', 'Prioridade')}
                  </option>
                  <option value="sla" className="bg-zinc-900">
                    {t('Oldest SLA', 'SLA mais antigo')}
                  </option>
                  <option value="updated" className="bg-zinc-900">
                    {t('Recently Updated', 'Atualização recente')}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Módulo 3: Status de Trabalho */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-900/60 px-3.5 py-2">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
              {t('Work:', 'Trabalho:')}
            </span>
            <button
              type="button"
              onClick={() => onChangeFilter('workStatus', 'all')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                filters.workStatus === 'all'
                  ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{t('All', 'Todos')}</span>
            </button>
            {workStatuses.map((ws) => {
              const active = filters.workStatus === ws.id;
              const count = workStatusCounts[ws.id] || 0;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() =>
                    onChangeFilter('workStatus', active ? 'all' : ws.id)
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                    active
                      ? `${ws.badgeClass} ring-1 ring-white/30`
                      : count === 0
                      ? 'border-white/5 bg-zinc-900/40 text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                      : 'border-white/10 bg-zinc-950/60 text-zinc-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${ws.dotClass}`} />
                  <span>{ws.label}</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none tabular-nums opacity-85">
                    {count}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                onChangeFilter(
                  'workStatus',
                  filters.workStatus === 'none' ? 'all' : 'none'
                )
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                filters.workStatus === 'none'
                  ? 'border-zinc-400/50 bg-zinc-700/40 text-zinc-100'
                  : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
            >
              <span>{t('No status', 'Sem status')}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none tabular-nums opacity-85">
                {workStatusCounts.none || 0}
              </span>
            </button>
          </div>

          {/* Módulo 4: Tags Personalizadas */}
          {customTags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-900/60 px-3.5 py-2">
              <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <Tags className="h-3.5 w-3.5 text-indigo-400" />
                Tags:
              </span>
              <button
                type="button"
                onClick={() => onChangeFilter('tagId', 'all')}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                  filters.tagId === 'all'
                    ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-200'
                    : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{t('All', 'Todas')}</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none tabular-nums opacity-85">
                  {tagTotalCount ?? totalAll}
                </span>
              </button>
              {customTags.map((tag) => {
                const style = getTagStyle(tag.color);
                const active = filters.tagId === tag.id;
                const count = tagCounts[tag.id] || 0;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onChangeFilter('tagId', active ? 'all' : tag.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                      active
                        ? `${style.pill} ring-1 ring-white/30`
                        : count === 0
                        ? 'border-white/5 bg-zinc-900/40 text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                        : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                    }`}
                  >
                    <span>{localizeTagLabel(tag, lang)}</span>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none tabular-nums opacity-85">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
