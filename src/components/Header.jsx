import React, { useEffect, useRef, useState } from 'react';
import {
  RefreshCw,
  Search,
  Tags,
  LayoutGrid,
  Table2,
  Crosshair,
  X,
  GitPullRequest,
  Palette,
  Send,
  Bell,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';
import { getThemes, formatRelativeTime } from '../utils/prHelpers.js';
import { useI18n } from '../i18n.jsx';

export default function Header({
  viewer,
  rateLimit,
  syncedAt,
  fromCache,
  syncing,
  onSync,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  searchInputRef,
  onOpenTagModal,
  theme,
  onThemeChange,
  notifications = [],
  onDismissNotification,
  onClearNotifications,
  onOpenPrByKey,
  autoSyncEnabled = true,
  onToggleAutoSync,
  readyForDiscordCount = 0,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const notifRef = useRef(null);
  const themeRef = useRef(null);
  const langRef = useRef(null);
  const { lang, setLang, t } = useI18n();
  const themes = getThemes(lang);
  const activeTheme = themes.find((th) => th.id === theme) || themes[0];

  useEffect(() => {
    if (!notifOpen && !themeOpen && !langOpen) return undefined;

    function handlePointerDown(event) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (themeOpen && themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeOpen(false);
      }
      if (langOpen && langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setNotifOpen(false);
        setThemeOpen(false);
        setLangOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifOpen, themeOpen, langOpen]);
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
        {/* Identidade */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
            <GitPullRequest className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white">
                PR-Hub Craft
              </h1>
              {viewer?.login && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300">
                  {viewer.avatarUrl && (
                    <img
                      src={viewer.avatarUrl}
                      alt={viewer.login}
                      className="h-3.5 w-3.5 rounded-full"
                    />
                  )}
                  @{viewer.login}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              {syncedAt ? (
                <>
                  Sync {formatRelativeTime(syncedAt, lang)}
                  {fromCache ? ' (cache)' : t(' (live)', ' (ao vivo)')}
                </>
              ) : (
                t('Loading state...', 'Carregando estado...')
              )}
              {rateLimit?.remaining != null && (
                <span className="ml-2 text-zinc-500">
                  · API {rateLimit.remaining}/{rateLimit.limit}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Busca central */}
        <div className="relative order-3 w-full md:order-2 md:max-w-md md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(
              'Search by title, #number, repo or branch... ( / )',
              'Buscar por título, #número, repo ou branch... ( / )'
            )}
            className="w-full rounded-xl border border-white/10 bg-zinc-900/90 py-2 pl-9 pr-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              title={t('Clear search', 'Limpar busca')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controles à direita */}
        <div className="order-2 flex items-center gap-2 md:order-3">
          {/* Switch de Visão */}
          <div className="flex items-center rounded-xl border border-white/10 bg-zinc-900/90 p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === 'kanban'
                  ? 'bg-indigo-500/20 text-indigo-200 shadow-sm ring-1 ring-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('Kanban View by Next Action', 'Visão Kanban por Próxima Ação')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-indigo-500/20 text-indigo-200 shadow-sm ring-1 ring-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('Dense Table with Batch Selection', 'Tabela Densa com Seleção em Lote')}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Table', 'Tabela')}</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('focus')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === 'focus'
                  ? 'bg-amber-500/20 text-amber-200 shadow-sm ring-1 ring-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('Focus Mode (Work Queue)', 'Modo Foco (Fila de Trabalho)')}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Focus', 'Foco')}</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('discord')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === 'discord'
                  ? 'bg-indigo-500/20 text-indigo-200 shadow-sm ring-1 ring-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t(
                'Generate formatted list to send on Discord',
                'Gerar lista formatada para enviar no Discord'
              )}
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Discord</span>
              {readyForDiscordCount > 0 && (
                <span className="rounded-full bg-indigo-500/25 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-200">
                  {readyForDiscordCount}
                </span>
              )}
            </button>
          </div>

          {/* Sino de Novidades + Auto-Sync */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-expanded={notifOpen}
              title={t('PR Activity Radar', 'Novidades detectadas nas PRs')}
              className={`relative inline-flex items-center justify-center rounded-xl border p-2 text-xs transition ${
                notifications.length > 0
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                  : 'border-white/10 bg-zinc-900/90 text-zinc-300 hover:border-white/20 hover:bg-zinc-800'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>

            <div
              aria-hidden={!notifOpen}
              className={`absolute right-0 top-11 z-40 w-80 sm:w-96 origin-top-right rounded-2xl border border-white/15 bg-zinc-950 p-3 shadow-2xl transition-all duration-200 ease-out ${
                notifOpen
                  ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                  : 'pointer-events-none -translate-y-1.5 scale-95 opacity-0'
              }`}
            >
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      {t('Activity Radar', 'Radar de Novidades')}
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      {t(
                        'Click a message to open & dismiss, or × to clear',
                        'Clique na msg p/ abrir e limpar, ou × p/ desmarcar'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] text-zinc-300">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={onToggleAutoSync}
                        className="rounded border-white/20 bg-zinc-900 text-indigo-500"
                      />
                      Auto 5m
                    </label>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onClearNotifications?.();
                        }}
                        className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                      >
                        {t('Clear all', 'Limpar tudo')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <p className="py-4 text-center text-xs text-zinc-500">
                      {t(
                        'No pending alerts. Dashboard checks automatically every 5 min.',
                        'Nenhum alerta pendente. O painel verifica automaticamente a cada 5 min.'
                      )}
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="group flex w-full items-start gap-2 rounded-xl border border-white/10 bg-zinc-900/70 p-2 transition hover:border-white/20 hover:bg-zinc-900"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onDismissNotification?.(n.id);
                            onOpenPrByKey?.(n.prKey);
                            setNotifOpen(false);
                          }}
                          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
                            <span className="truncate font-mono text-indigo-300">
                              {n.prKey}
                            </span>
                            <span className="shrink-0">{formatRelativeTime(n.at, lang)}</span>
                          </div>
                          <span className="text-xs font-medium text-zinc-100 group-hover:text-white">
                            {n.message}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissNotification?.(n.id);
                          }}
                          title={t('Dismiss alert', 'Desmarcar este alerta')}
                          aria-label={t('Dismiss alert', 'Desmarcar este alerta')}
                          className="mt-0.5 shrink-0 rounded-lg border border-white/10 bg-white/5 p-1 text-zinc-400 transition hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
          </div>

          {/* Seletor de Idioma Dropdown (só abre ao clicar) */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => {
                setLangOpen((v) => !v);
                setThemeOpen(false);
                setNotifOpen(false);
              }}
              aria-expanded={langOpen}
              title={t('Switch language', 'Alternar idioma')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-zinc-800"
            >
              <Globe className="h-3.5 w-3.5 text-zinc-400" />
              <span>{lang.toUpperCase()}</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-11 z-40 w-44 rounded-2xl border border-white/15 bg-zinc-950 p-1.5 shadow-2xl">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {t('Language', 'Idioma')}
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLang('pt');
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                      lang === 'pt' ? 'bg-white/10 font-semibold text-white' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span>Português (BR)</span>
                    {lang === 'pt' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLang('en');
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                      lang === 'en' ? 'bg-white/10 font-semibold text-white' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span>English (US)</span>
                    {lang === 'en' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Seletor de Temas Dropdown (só abre ao clicar) */}
          <div className="relative" ref={themeRef}>
            <button
              type="button"
              onClick={() => {
                setThemeOpen((v) => !v);
                setLangOpen(false);
                setNotifOpen(false);
              }}
              aria-expanded={themeOpen}
              title={t('Switch color theme', 'Alternar tema de cores')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/90 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-zinc-800"
            >
              <Palette className="h-3.5 w-3.5 text-zinc-400" />
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/20"
                style={{ backgroundColor: activeTheme?.swatch || '#3b82f6' }}
              />
              <span className="hidden xl:inline">{activeTheme?.label || 'Tema'}</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {themeOpen && (
              <div className="absolute right-0 top-11 z-40 w-52 rounded-2xl border border-white/15 bg-zinc-950 p-1.5 shadow-2xl">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {t('Color Themes', 'Temas de Cores')}
                </div>
                <div className="space-y-0.5">
                  {themes.map((th) => {
                    const active = theme === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          onThemeChange(th.id);
                          setThemeOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                          active ? 'bg-white/10 font-semibold text-white' : 'text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: th.swatch }}
                          />
                          <span>{th.label}</span>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenTagModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-zinc-800"
          >
            <Tags className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Tags</span>
          </button>

          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>
              {syncing ? t('Syncing...', 'Sincronizando...') : t('Sync', 'Sincronizar')}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
