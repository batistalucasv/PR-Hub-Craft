import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Copy,
  Check,
  CheckCheck,
  ExternalLink,
  Sparkles,
  CheckSquare,
  Square,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  formatDiscordPrLine,
  formatRelativeTime,
  getCiMeta,
  getReviewerBadgeMeta,
} from '../utils/prHelpers.js';
import { useI18n } from '../i18n.jsx';

export default function DiscordExportView({
  prs,
  onBatchPatch,
  onPatchPr,
  onOpenDetail,
}) {
  const { lang, t } = useI18n();
  const [preset, setPreset] = useState('prontas'); // prontas | foco_finalizar | todas_minhas
  const [stripIssueSuffix, setStripIssueSuffix] = useState(true);
  const [hideAlreadySent, setHideAlreadySent] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(null);
  const [markingSent, setMarkingSent] = useState(false);

  const candidatePrs = useMemo(() => {
    return prs.filter((pr) => {
      if (pr.role !== 'author' || pr.stage === 'arquivado') return false;
      if (hideAlreadySent && pr.discordSentAt) return false;

      if (preset === 'prontas') {
        return !pr.hasConflict && !pr.hasCiFailure && !pr.isDraft;
      }
      if (preset === 'foco_finalizar') {
        return (
          pr.selectedForToday ||
          pr.stage === 'finalizado' ||
          pr.stage === 'finalizar' ||
          pr.stage === 'aprovado' ||
          pr.feedbackAddressed
        );
      }
      return true;
    });
  }, [prs, preset, hideAlreadySent]);

  const initializedScopeRef = useRef(null);
  const scopeKey = `${preset}:${hideAlreadySent}`;

  // Inicializar seleção ao trocar filtro/escopo sem re-selecionar quando o usuário desmarcar todas
  useEffect(() => {
    const candidateKeySet = new Set(candidatePrs.map((p) => p.prKey));
    if (candidatePrs.length === 0) {
      setSelectedKeys([]);
      return;
    }
    if (initializedScopeRef.current !== scopeKey) {
      initializedScopeRef.current = scopeKey;
      setSelectedKeys(
        candidatePrs.filter((p) => !p.discordSentAt).map((p) => p.prKey)
      );
      return;
    }
    setSelectedKeys((prev) => {
      const kept = prev.filter((k) => candidateKeySet.has(k));
      return kept.length === prev.length ? prev : kept;
    });
  }, [candidatePrs, scopeKey]);

  const selectedSet = new Set(selectedKeys);
  const selectedPrs = candidatePrs.filter((p) => selectedSet.has(p.prKey));

  const discordMarkdown = useMemo(() => {
    return selectedPrs
      .map((pr) => formatDiscordPrLine(pr, stripIssueSuffix))
      .join('\n');
  }, [selectedPrs, stripIssueSuffix]);

  function toggleKey(prKey) {
    setSelectedKeys((prev) =>
      prev.includes(prKey) ? prev.filter((k) => k !== prKey) : [...prev, prKey]
    );
  }

  function selectAllVisible() {
    setSelectedKeys(candidatePrs.map((p) => p.prKey));
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  async function handleCopyAll() {
    if (!discordMarkdown) return;
    try {
      await navigator.clipboard.writeText(discordMarkdown);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  async function handleCopyLine(pr, e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatDiscordPrLine(pr, stripIssueSuffix));
      setCopiedSingle(pr.prKey);
      setTimeout(() => setCopiedSingle(null), 1500);
    } catch {
      // ignore
    }
  }

  async function handleMarkSent() {
    if (!selectedPrs.length) return;
    setMarkingSent(true);
    try {
      await onBatchPatch(
        selectedPrs.map((p) => p.prKey),
        { discordSentAt: new Date().toISOString() }
      );
    } finally {
      setMarkingSent(false);
    }
  }

  return (
    <section className="w-full px-3 py-4 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {t(
                'Discord List Generator (Request Review)',
                'Gerador de Lista para Discord (Solicitar Review)'
              )}
            </h2>
            <p className="text-xs text-zinc-400">
              {t(
                'Select your ready/finished PRs and copy them in exact Markdown link format to send to maintainers.',
                'Selecione suas PRs finalizadas/prontas e copie no formato exato de link Markdown para enviar aos mantenedores.'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/10 bg-zinc-950/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPreset('prontas')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                preset === 'prontas'
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t('Ready for Review', 'Prontas p/ Review')}
            </button>
            <button
              type="button"
              onClick={() => setPreset('foco_finalizar')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                preset === 'foco_finalizar'
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t('Focus / Addressed', 'Foco / Corrigidas')}
            </button>
            <button
              type="button"
              onClick={() => setPreset('todas_minhas')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                preset === 'todas_minhas'
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t('All Mine', 'Todas Minhas')}
            </button>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={stripIssueSuffix}
              onChange={(e) => setStripIssueSuffix(e.target.checked)}
              className="rounded border-white/20 bg-zinc-900 text-indigo-500"
            />
            {t('Strip', 'Limpar')} <code className="font-mono text-[10px]">(#issue)</code>{' '}
            {t('from end', 'do fim')}
          </label>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={hideAlreadySent}
              onChange={(e) => setHideAlreadySent(e.target.checked)}
              className="rounded border-white/20 bg-zinc-900 text-indigo-500"
            />
            {t('Hide already sent', 'Ocultar já enviadas')}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Coluna Esquerda: Seleção de PRs */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3.5 lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <span className="text-xs font-semibold text-zinc-200">
              {t(
                `${selectedPrs.length} of ${candidatePrs.length} PR(s) selected`,
                `${selectedPrs.length} de ${candidatePrs.length} PR(s) selecionadas`
              )}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllVisible}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-200 hover:bg-white/10"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                {t('Select all', 'Selecionar todas')}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/10"
              >
                <Square className="h-3.5 w-3.5" />
                {t('Clear', 'Limpar')}
              </button>
            </div>
          </div>

          {candidatePrs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">
              {lang === 'en' ? (
                <>
                  No PRs found in this filter. Try switching to <strong>All Mine</strong> or
                  unchecking <strong>Hide already sent</strong>.
                </>
              ) : (
                <>
                  Nenhuma PR encontrada nesse filtro. Experimente alternar para{' '}
                  <strong>Todas Minhas</strong> ou desmarcar <strong>Ocultar já enviadas</strong>.
                </>
              )}
            </div>
          ) : (
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {candidatePrs.map((pr) => {
                const checked = selectedSet.has(pr.prKey);
                const ciMeta = getCiMeta(pr.ciState, lang);

                return (
                  <div
                    key={pr.prKey}
                    onClick={() => toggleKey(pr.prKey)}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition ${
                      checked
                        ? 'border-indigo-500/45 bg-indigo-500/10'
                        : 'border-white/10 bg-zinc-950/50 hover:border-white/20'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="mt-1 rounded border-white/20 bg-zinc-900 text-indigo-500"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="font-mono text-zinc-400">{pr.repo}</span>
                          <span className="font-mono font-semibold text-indigo-300">
                            #{pr.number}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[10px] ${ciMeta.className}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${ciMeta.dot}`} />
                            {ciMeta.short}
                          </span>
                          {pr.feedbackAddressed && (
                            <span className="inline-flex items-center gap-1 rounded border border-sky-500/35 bg-sky-500/15 px-1.5 py-0.2 text-[10px] text-sky-300">
                              <Sparkles className="h-2.5 w-2.5" />
                              {t('Fixed w/ commit', 'Corrigida c/ commit')}
                            </span>
                          )}
                          {pr.hasConflict && (
                            <span className="rounded border border-rose-500/35 bg-rose-500/15 px-1.5 py-0.2 text-[10px] text-rose-300">
                              {t('Conflict', 'Conflito')}
                            </span>
                          )}
                          {pr.discordSentAt && (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 text-[10px] text-emerald-300"
                              title={t(
                                `Marked at ${new Date(pr.discordSentAt).toLocaleString('en-US')}`,
                                `Marcada em ${new Date(pr.discordSentAt).toLocaleString('pt-BR')}`
                              )}
                            >
                              <CheckCheck className="h-2.5 w-2.5" />
                              {t('Sent', 'Enviada')} {formatRelativeTime(pr.discordSentAt, lang)}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs font-medium text-zinc-100">
                          {pr.title}
                        </div>

                        {pr.humanReviewers?.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {pr.humanReviewers.map((rev) => {
                              const meta = getReviewerBadgeMeta(rev, lang);
                              if (!meta || !meta.shouldShow) return null;
                              return (
                                <span
                                  key={rev.login}
                                  className={`rounded border px-1.5 py-0.2 text-[10px] ${meta.className}`}
                                >
                                  @{rev.login} {meta.symbol}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {pr.discordSentAt && (
                        <button
                          type="button"
                          onClick={() => onPatchPr(pr.prKey, { discordSentAt: null })}
                          title={t('Unmark as sent on Discord', 'Desmarcar como enviada no Discord')}
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleCopyLine(pr, e)}
                        title={t('Copy only this line', 'Copiar apenas esta linha')}
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10"
                      >
                        {copiedSingle === pr.prKey ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(pr)}
                        title={t('Open PR details', 'Abrir detalhes da PR')}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
                      >
                        {t('Open', 'Abrir')}
                      </button>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Preview Markdown pronto para colar */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/60 p-4 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('Discord Paste Preview', 'Preview para Colar no Discord')}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {t(
                  'Each line is formatted as a clickable Discord link.',
                  'Cada linha já sai formatada como link clicável do Discord.'
                )}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-zinc-950 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
              {selectedPrs.length} PRs
            </span>
          </div>

          {selectedPrs.length > 0 && (
            <div className="mb-2.5 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/60 p-2">
              {selectedPrs.map((pr) => (
                <div
                  key={pr.prKey}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px]"
                >
                  <span className="truncate text-zinc-200">
                    <span className="mr-1.5 font-mono font-semibold text-indigo-300">
                      #{pr.number}
                    </span>
                    {pr.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleKey(pr.prKey)}
                    title={t(`Uncheck #${pr.number} from list`, `Desmarcar #${pr.number} desta lista`)}
                    aria-label={t(`Uncheck #${pr.number}`, `Desmarcar #${pr.number}`)}
                    className="shrink-0 rounded p-0.5 text-zinc-400 transition hover:bg-rose-500/20 hover:text-rose-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            readOnly
            rows={12}
            value={
              discordMarkdown ||
              t(
                'Select at least one PR on the left to generate the list...',
                'Selecione ao menos uma PR à esquerda para gerar a lista...'
              )
            }
            className="w-full flex-1 rounded-xl border border-white/10 bg-zinc-950/90 p-3 font-mono text-xs leading-relaxed text-zinc-200 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              disabled={!discordMarkdown}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copiedAll ? (
                <>
                  <Check className="h-4 w-4" />
                  {t(
                    `List copied (${selectedPrs.length} PRs)!`,
                    `Lista copiada (${selectedPrs.length} PRs)!`
                  )}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t(
                    `Copy List for Discord (${selectedPrs.length})`,
                    `Copiar Lista p/ Discord (${selectedPrs.length})`
                  )}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleMarkSent}
              disabled={!selectedPrs.length || markingSent}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              title={t(
                'Marks selected PRs with a sent timestamp so you remember which ones you already asked review for',
                'Marca as PRs selecionadas com data de envio para você lembrar do que já pediu review'
              )}
            >
              <CheckCheck className="h-4 w-4" />
              {markingSent
                ? t('Marking...', 'Marcando...')
                : t('Mark as sent', 'Marcar como enviadas')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
