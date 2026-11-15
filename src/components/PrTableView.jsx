import React, { useState } from 'react';
import {
  Star,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Laptop,
  AlertOctagon,
  Clock,
  CheckSquare,
  X,
  Bot,
} from 'lucide-react';
import {
  PRIORITY_MAP,
  getPriorities,
  getStages,
  getArchivedStage,
  getWorkStatuses,
  formatRelativeTime,
  getCheckoutCommand,
  getCiMeta,
  getCodeRabbitSyncMeta,
  getSlaBadgeStyle,
  getStageMeta,
  getTagStyle,
  getWorkStatusMeta,
} from '../utils/prHelpers.js';
import { localizeBackendText, localizeTagLabel, useI18n } from '../i18n.jsx';

export default function PrTableView({
  prs,
  customTags,
  onOpenDetail,
  onPatchPr,
  onBatchPatch,
  onSelectRepo,
}) {
  const { lang, t } = useI18n();
  const priorities = getPriorities(lang);
  const stages = getStages(lang);
  const archivedStage = getArchivedStage(lang);
  const workStatuses = getWorkStatuses(lang);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const visibleKeys = prs.map((p) => p.prKey);
  const selectedSet = new Set(selectedKeys.filter((k) => visibleKeys.includes(k)));
  const allSelected = visibleKeys.length > 0 && selectedSet.size === visibleKeys.length;

  const tagMap = new Map(customTags.map((t) => [t.id, t]));

  function toggleOne(prKey, e) {
    e.stopPropagation();
    setSelectedKeys((prev) =>
      prev.includes(prKey) ? prev.filter((k) => k !== prKey) : [...prev, prKey]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(visibleKeys);
    }
  }

  async function runBatch(patch) {
    const keys = Array.from(selectedSet);
    if (!keys.length) return;
    await onBatchPatch(keys, patch);
  }

  async function copyText(id, value, e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <section className="w-full px-3 py-4 sm:px-4">
      {/* Barra de Ações em Lote */}
      {selectedSet.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/40 bg-indigo-950/50 px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
            <CheckSquare className="h-4 w-4 text-indigo-400" />
            <span>
              {t(`${selectedSet.size} PR(s) selected`, `${selectedSet.size} PR(s) selecionadas`)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedKeys([])}
              className="ml-1 rounded-md p-0.5 text-indigo-300 hover:bg-white/10"
              title={t('Clear selection', 'Limpar seleção')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runBatch({ selectedForToday: true })}
              className="rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
            >
              {t('⭐ Send to Focus', '⭐ Mandar p/ Foco')}
            </button>

            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                const val = e.target.value === 'CLEAR' ? null : e.target.value;
                runBatch({ priority: val });
                e.target.value = '';
              }}
              className="rounded-lg border border-white/15 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
            >
              <option value="">{t('Set Priority...', 'Definir Prioridade...')}</option>
              {priorities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="CLEAR">{t('Clear priority', 'Limpar prioridade')}</option>
            </select>

            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                const val = e.target.value === 'AUTO' ? null : e.target.value;
                runBatch({ manualStage: val });
                e.target.value = '';
              }}
              className="rounded-lg border border-white/15 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
            >
              <option value="">{t('Move Stage...', 'Mover Estágio...')}</option>
              <option value="AUTO">{t('Automatic', 'Automático')}</option>
              {[...stages, archivedStage].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                const val = e.target.value === 'CLEAR' ? null : e.target.value;
                runBatch({ workStatus: val });
                e.target.value = '';
              }}
              className="rounded-lg border border-white/15 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
            >
              <option value="">{t('Set Work Status...', 'Definir Trabalho...')}</option>
              {workStatuses.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.icon} {ws.label}
                </option>
              ))}
              <option value="CLEAR">{t('No status', 'Sem status')}</option>
            </select>

            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                runBatch({ addTag: e.target.value });
                e.target.value = '';
              }}
              className="rounded-lg border border-white/15 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
            >
              <option value="">{t('+ Add Tag...', '+ Adicionar Tag...')}</option>
              {customTags.map((tItem) => (
                <option key={tItem.id} value={tItem.id}>
                  {localizeTagLabel(tItem, lang)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-950/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-white/20 bg-zinc-900 text-indigo-500"
                  />
                </th>
                <th className="w-10 px-2 py-3 text-center">{t('Focus', 'Foco')}</th>
                <th className="w-32 px-2 py-3">{t('Work', 'Trabalho')}</th>
                <th className="w-24 px-2 py-3">{t('Prio', 'Prior.')}</th>
                <th className="min-w-[300px] px-3 py-3">Pull Request</th>
                <th className="min-w-[200px] px-3 py-3">{t('Next Action', 'Próxima Ação')}</th>
                <th className="min-w-[170px] px-3 py-3">{t('Health & SLA', 'Saúde & SLA')}</th>
                <th className="min-w-[160px] px-3 py-3">Tags</th>
                <th className="w-36 px-3 py-3 text-right">{t('Actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {prs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-zinc-500">
                    {t('No PRs match the current filters.', 'Nenhuma PR encontrada com os filtros atuais.')}
                  </td>
                </tr>
              ) : (
                prs.map((pr) => {
                  const stageMeta = getStageMeta(pr.stage, lang);
                  const priorityMeta = PRIORITY_MAP[pr.priority] || null;
                  const workMeta = getWorkStatusMeta(pr.workStatus, lang);
                  const ciMeta = getCiMeta(pr.ciState, lang);
                  const crSyncMeta = getCodeRabbitSyncMeta(
                    pr.codeRabbitCommitSync,
                    pr.codeRabbitPendingCount,
                    lang
                  );
                  const slaClass = getSlaBadgeStyle(pr.sla);
                  const isSelected = selectedSet.has(pr.prKey);
                  const assignedTags = (pr.tags || [])
                    .map((id) => tagMap.get(id))
                    .filter(Boolean);

                  return (
                    <tr
                      key={pr.prKey}
                      onClick={() => onOpenDetail(pr)}
                      className={`cursor-pointer transition ${
                        workMeta
                          ? workMeta.cardClass
                          : isSelected
                          ? 'bg-indigo-500/10'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => toggleOne(pr.prKey, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-white/20 bg-zinc-900 text-indigo-500"
                        />
                      </td>

                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPatchPr(pr.prKey, {
                              selectedForToday: !pr.selectedForToday,
                            });
                          }}
                          className="rounded p-1 hover:bg-white/10"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              pr.selectedForToday
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-zinc-600 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      </td>

                      <td
                        className="px-2 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={pr.workStatus || ''}
                          onChange={(e) =>
                            onPatchPr(pr.prKey, {
                              workStatus: e.target.value || null,
                            })
                          }
                          className={`rounded-lg border px-1.5 py-1 text-[11px] font-semibold focus:outline-none ${
                            workMeta
                              ? workMeta.badgeClass
                              : 'border-white/10 bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          <option value="" className="bg-zinc-900 text-zinc-300">
                            —
                          </option>
                          {workStatuses.map((ws) => (
                            <option
                              key={ws.id}
                              value={ws.id}
                              className="bg-zinc-900 text-zinc-100"
                            >
                              {ws.icon} {ws.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td
                        className="px-2 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={pr.priority || ''}
                          onChange={(e) =>
                            onPatchPr(pr.prKey, {
                              priority: e.target.value || null,
                            })
                          }
                          className={`rounded-lg border px-1.5 py-1 text-[11px] font-semibold focus:outline-none ${
                            priorityMeta
                              ? priorityMeta.badgeClass
                              : 'border-white/10 bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          <option value="" className="bg-zinc-900 text-zinc-300">
                            —
                          </option>
                          {priorities.map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              className="bg-zinc-900 text-zinc-100"
                            >
                              {p.short}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRepo?.(pr.repo);
                            }}
                            title={t(`Filter by repository ${pr.repo}`, `Filtrar pelo repositório ${pr.repo}`)}
                            className="rounded px-1 py-0.5 font-mono transition hover:bg-white/10 hover:text-indigo-300"
                          >
                            {pr.repo}
                          </button>
                          <span className="font-mono font-semibold text-indigo-300">
                            #{pr.number}
                          </span>
                          {pr.isDraft && (
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                              Draft
                            </span>
                          )}
                          {pr.localWorktree && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-200"
                              title={pr.localWorktree.path}
                            >
                              <Laptop className="h-2.5 w-2.5" />
                              Worktree
                            </span>
                          )}
                          <span className="text-zinc-600">
                            · {formatRelativeTime(pr.updatedAt, lang)}
                          </span>
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-sm font-medium text-zinc-100">
                          {pr.title}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                          {pr.headRefName} → {pr.baseRefName}
                        </div>
                      </td>

                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={pr.manualStage || ''}
                          onChange={(e) =>
                            onPatchPr(pr.prKey, {
                              manualStage: e.target.value || null,
                            })
                          }
                          className={`mb-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium focus:outline-none ${stageMeta.border} ${stageMeta.bg} ${stageMeta.accent}`}
                        >
                          <option value="" className="bg-zinc-900 text-zinc-200">
                            Auto: {getStageMeta(pr.autoStage, lang).label}
                          </option>
                          {[...stages, archivedStage].map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              className="bg-zinc-900 text-zinc-100"
                            >
                              Manual: {s.label}
                            </option>
                          ))}
                        </select>
                        <div className="line-clamp-1 text-[11px] text-zinc-400">
                          {localizeBackendText(pr.actionReason, lang)}
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${ciMeta.className}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${ciMeta.dot}`} />
                            {ciMeta.short}
                          </span>
                          {pr.hasConflict && (
                            <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-300">
                              <AlertOctagon className="h-2.5 w-2.5" />
                              {t('Conflict', 'Conflito')}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${slaClass}`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {localizeBackendText(pr.sla?.label, lang)}
                          </span>
                          {pr.codeRabbitPendingCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-violet-500/35 bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300"
                              title={t(
                                `${pr.codeRabbitPendingCount} CodeRabbit review(s) awaiting reply`,
                                `${pr.codeRabbitPendingCount} review(s) do CodeRabbit aguardando resposta`
                              )}
                            >
                              <Bot className="h-2.5 w-2.5" />
                              CodeRabbit ({pr.codeRabbitPendingCount})
                            </span>
                          )}
                          {crSyncMeta && (
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${crSyncMeta.className}`}
                              title={`${crSyncMeta.label}\n${crSyncMeta.detail}`}
                            >
                              {crSyncMeta.short}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {assignedTags.length === 0 ? (
                            <span className="text-[11px] text-zinc-600">—</span>
                          ) : (
                            assignedTags.map((tag) => (
                              <span
                                key={tag.id}
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                  getTagStyle(tag.color).pill
                                }`}
                              >
                                {localizeTagLabel(tag, lang)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td
                        className="px-3 py-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) =>
                              copyText(`${pr.prKey}-rev`, `/review ${pr.url}`, e)
                            }
                            title={`${t('Copy', 'Copiar')} /review ${pr.url}`}
                            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10"
                          >
                            {copiedId === `${pr.prKey}-rev` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-indigo-300" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) =>
                              copyText(
                                `${pr.prKey}-co`,
                                getCheckoutCommand(pr),
                                e
                              )
                            }
                            title={getCheckoutCommand(pr)}
                            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10"
                          >
                            {copiedId === `${pr.prKey}-co` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Terminal className="h-3.5 w-3.5 text-cyan-300" />
                            )}
                          </button>

                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
