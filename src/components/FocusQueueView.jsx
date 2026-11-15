import React from 'react';
import { Crosshair, Flame, Sparkles, Star, AlertTriangle } from 'lucide-react';
import PrCard from './PrCard.jsx';
import { useI18n } from '../i18n.jsx';

export default function FocusQueueView({
  prs,
  customTags,
  onOpenDetail,
  onPatchPr,
  onSelectRepo,
}) {
  const { t } = useI18n();
  const focusPrs = prs.filter((p) => p.selectedForToday && p.stage !== 'arquivado');

  const problemPrs = prs.filter(
    (p) =>
      !p.selectedForToday &&
      p.stage !== 'arquivado' &&
      (p.hasConflict ||
        p.hasCiFailure ||
        p.stage === 'problema' ||
        p.stage === 'corrigir_conflito_ci')
  );

  const problemKeys = new Set(problemPrs.map((p) => p.prKey));

  const recommendedPrs = prs.filter(
    (p) =>
      !p.selectedForToday &&
      p.stage !== 'arquivado' &&
      !problemKeys.has(p.prKey) &&
      (p.priority === 'P0' ||
        p.priority === 'P1' ||
        ['overdue_7d', 'overdue_14d', 'danger_30d'].includes(p.sla?.status) ||
        p.stage === 'revisar' ||
        p.stage === 'resolver_feedback')
  );

  const totalChecklistItems = focusPrs.reduce(
    (acc, p) => acc + (p.checklist?.length || 0),
    0
  );
  const doneChecklistItems = focusPrs.reduce(
    (acc, p) => acc + (p.checklist?.filter((c) => c.done).length || 0),
    0
  );

  return (
    <section className="w-full space-y-6 px-3 py-4 sm:px-4">
      {/* Bloco 1: Fila selecionada para Hoje */}
      <div className="rounded-2xl border border-amber-500/25 bg-zinc-950/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Crosshair className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {t(`My Focus Queue (${focusPrs.length})`, `Minha Fila de Foco (${focusPrs.length})`)}
              </h2>
              <p className="text-xs text-zinc-400">
                {t(
                  'PRs starred ⭐ to tackle now, with checklist visible on the card.',
                  'PRs selecionadas com ⭐ para atacar agora, com checklist visível no card.'
                )}
              </p>
            </div>
          </div>

          {totalChecklistItems > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs">
              <span className="text-zinc-400">{t('Task progress:', 'Progresso das tarefas:')}</span>
              <span className="font-semibold text-emerald-300">
                {doneChecklistItems}/{totalChecklistItems}
              </span>
            </div>
          )}
        </div>

        {focusPrs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-zinc-900/40 p-8 text-center">
            <Star className="mx-auto mb-2 h-6 w-6 text-amber-400/70" />
            <p className="text-sm font-medium text-zinc-200">
              {t('Your focus queue is empty!', 'Sua fila de foco está vazia!')}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t(
                'Click the ⭐ star on any PR below (or in Kanban/Table) to build your work queue.',
                'Clique na estrela ⭐ em qualquer PR abaixo (ou no Kanban/Tabela) para montar sua fila de trabalho.'
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {focusPrs.map((pr) => (
              <PrCard
                key={pr.prKey}
                pr={pr}
                customTags={customTags}
                onOpenDetail={onOpenDetail}
                onPatchPr={onPatchPr}
                onSelectRepo={onSelectRepo}
                expandedChecklist
              />
            ))}
          </div>
        )}
      </div>

      {/* Bloco 2: Problemas (Conflito de Merge / CI Falhando) */}
      <div className="rounded-2xl border border-rose-500/25 bg-zinc-950/60 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t(`Issues & Blockers (${problemPrs.length})`, `Problemas (${problemPrs.length})`)}
            </h3>
            <p className="text-xs text-zinc-400">
              {t(
                'PRs with merge conflicts, broken CI or critical blockers requiring fix.',
                'PRs com conflito de merge, CI quebrado ou impedimentos críticos aguardando correção.'
              )}
            </p>
          </div>
        </div>

        {problemPrs.length === 0 ? (
          <p className="text-xs text-zinc-500">
            {t(
              'No PRs with conflicts or broken CI right now! Everything clean.',
              'Nenhuma PR com conflito ou CI quebrado no momento! Tudo limpo.'
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {problemPrs.map((pr) => (
              <div key={pr.prKey} className="relative">
                <PrCard
                  pr={pr}
                  customTags={customTags}
                  onOpenDetail={onOpenDetail}
                  onPatchPr={onPatchPr}
                  onSelectRepo={onSelectRepo}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPatchPr(pr.prKey, { selectedForToday: true });
                  }}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
                >
                  <Flame className="h-3.5 w-3.5" />
                  {t('Pull into Focus Queue', 'Puxar para Fila de Foco')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bloco 3: Sugeridas para puxar para o foco */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t(`Suggested to Work On (${recommendedPrs.length})`, `Sugeridas para Trabalhar (${recommendedPrs.length})`)}
            </h3>
            <p className="text-xs text-zinc-400">
              {t(
                'PRs with P0/P1 priority, human feedback, pending review, or SLA alert.',
                'PRs com prioridade P0/P1, feedback humano, revisão pendente ou SLA em alerta.'
              )}
            </p>
          </div>
        </div>

        {recommendedPrs.length === 0 ? (
          <p className="text-xs text-zinc-500">
            {t(
              'No pending suggestions outside your focus queue.',
              'Nenhuma sugestão pendente fora da sua fila de foco.'
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recommendedPrs.map((pr) => (
              <div key={pr.prKey} className="relative">
                <PrCard
                  pr={pr}
                  customTags={customTags}
                  onOpenDetail={onOpenDetail}
                  onPatchPr={onPatchPr}
                  onSelectRepo={onSelectRepo}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPatchPr(pr.prKey, { selectedForToday: true });
                  }}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  <Flame className="h-3.5 w-3.5" />
                  {t('Pull into Focus Queue', 'Puxar para Fila de Foco')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
