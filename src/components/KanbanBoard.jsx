import React, { useEffect, useState } from 'react';
import {
  Minimize2,
  Maximize2,
  ChevronsDownUp,
  ChevronsUpDown,
  RotateCcw,
} from 'lucide-react';
import { getStages, getArchivedStage } from '../utils/prHelpers.js';
import { useI18n } from '../i18n.jsx';
import PrCard from './PrCard.jsx';

export default function KanbanBoard({
  prs,
  customTags,
  showArchived,
  onOpenDetail,
  onPatchPr,
  onSelectRepo,
}) {
  const [draggingKey, setDraggingKey] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const [collapsedCols, setCollapsedCols] = useState(() => {
    try {
      const saved = localStorage.getItem('pr-hub-craft-collapsed-cols');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [compactAll, setCompactAll] = useState(false);
  const [cardMinimizedOverrides, setCardMinimizedOverrides] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(
        'pr-hub-craft-collapsed-cols',
        JSON.stringify(collapsedCols)
      );
    } catch {
      // ignore storage errors
    }
  }, [collapsedCols]);

  const { lang, t } = useI18n();
  const stages = getStages(lang);
  const archivedStage = getArchivedStage(lang);
  const columns = showArchived ? [...stages, archivedStage] : stages;
  const collapsedSet = new Set(collapsedCols);
  const visibleCollapsedCount = columns.filter((c) => collapsedSet.has(c.id)).length;

  function toggleColumn(stageId) {
    setCollapsedCols((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    );
  }

  function handleToggleCompactAll() {
    const next = !compactAll;
    setCompactAll(next);
    setCardMinimizedOverrides({});
  }

  function handleToggleCardMinimize(prKey) {
    setCardMinimizedOverrides((prev) => {
      const current = prKey in prev ? prev[prKey] : compactAll;
      return { ...prev, [prKey]: !current };
    });
  }

  function handleDragStart(e, prKey) {
    setDraggingKey(prKey);
    e.dataTransfer.setData('text/plain', prKey);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, stageId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  }

  function handleDrop(e, stageId) {
    e.preventDefault();
    const prKey = e.dataTransfer.getData('text/plain') || draggingKey;
    setDraggingKey(null);
    setDragOverStage(null);
    if (!prKey) return;

    const targetPr = prs.find((p) => p.prKey === prKey);
    if (!targetPr) return;

    const manualStage = targetPr.autoStage === stageId ? null : stageId;
    onPatchPr(prKey, { manualStage });
  }

  return (
    <section className="w-full px-3 py-3 sm:px-4">
      {/* Barra rápida de controles do Kanban */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCompactAll}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
              compactAll
                ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200'
                : 'border-white/10 bg-zinc-900/70 text-zinc-300 hover:border-white/20 hover:bg-zinc-900'
            }`}
          >
            {compactAll ? (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            )}
            {compactAll ? t('Expand all cards', 'Expandir todos os cards') : t('Collapse all cards', 'Minimizar todos os cards')}
          </button>

          {visibleCollapsedCount > 0 && (
            <button
              type="button"
              onClick={() => setCollapsedCols([])}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20"
            >
              <RotateCcw className="h-3 w-3" />
              {t(
                `Restore ${visibleCollapsedCount} collapsed column${visibleCollapsedCount > 1 ? 's' : ''}`,
                `Restaurar ${visibleCollapsedCount} coluna${visibleCollapsedCount > 1 ? 's' : ''} minimizada${visibleCollapsedCount > 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>

        <span className="hidden text-[11px] text-zinc-500 sm:inline">
          {t(
            'Tip: collapse columns or cards to focus on priority PRs and drag cards between columns.',
            'Dica: minimize colunas ou cards para focar apenas nas PRs prioritárias e arraste cards entre colunas.'
          )}
        </span>
      </div>

      {/* Colunas preenchendo 100% da largura */}
      <div className="flex w-full gap-3 overflow-x-auto pb-4">
        {columns.map((stage) => {
          const items = prs.filter((p) => p.stage === stage.id);
          const isDropTarget = dragOverStage === stage.id;
          const isCollapsed = collapsedSet.has(stage.id);

          if (isCollapsed) {
            return (
              <div
                key={stage.id}
                onClick={() => toggleColumn(stage.id)}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={() => {
                  if (dragOverStage === stage.id) setDragOverStage(null);
                }}
                onDrop={(e) => handleDrop(e, stage.id)}
                title={t(`Expand column: ${stage.label} (${items.length})`, `Expandir coluna: ${stage.label} (${items.length})`)}
                className={`flex min-h-[420px] w-12 shrink-0 cursor-pointer flex-col items-center gap-3 rounded-2xl border py-3 transition ${
                  isDropTarget
                    ? 'border-indigo-400/60 bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-white/10 bg-zinc-950/60 hover:border-white/20 hover:bg-zinc-900/80'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleColumn(stage.id);
                  }}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                  title={t('Expand column', 'Expandir coluna')}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>

                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stage.dot}`} />

                <span className="rounded-full border border-white/10 bg-zinc-900 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                  {items.length}
                </span>

                <span
                  className="mt-1 select-none text-xs font-semibold tracking-wide text-zinc-300"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {stage.label}
                </span>
              </div>
            );
          }

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={() => {
                if (dragOverStage === stage.id) setDragOverStage(null);
              }}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex min-h-[440px] min-w-[245px] flex-1 flex-col rounded-2xl border transition ${
                isDropTarget
                  ? 'border-indigo-400/60 bg-indigo-500/10 ring-2 ring-indigo-500/20'
                  : 'border-white/10 bg-zinc-950/55'
              }`}
            >
              {/* Cabeçalho da coluna */}
              <div className="border-b border-white/10 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stage.dot}`} />
                    <h2 className="truncate text-sm font-semibold text-zinc-100">
                      {stage.label}
                    </h2>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-zinc-300">
                      {items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleColumn(stage.id)}
                      title={t('Collapse column', 'Minimizar coluna')}
                      className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-zinc-500">
                  {stage.description}
                </p>
              </div>

              {/* Lista de cards */}
              <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                {items.length === 0 ? (
                  <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 px-3 text-center text-xs text-zinc-600">
                    {t('No PRs here. Drag a card to move.', 'Nenhuma PR aqui. Arraste um card para mover.')}
                  </div>
                ) : (
                  items.map((pr) => {
                    const isCardMinimized =
                      pr.prKey in cardMinimizedOverrides
                        ? cardMinimizedOverrides[pr.prKey]
                        : compactAll;
                    return (
                      <PrCard
                        key={pr.prKey}
                        pr={pr}
                        customTags={customTags}
                        onOpenDetail={onOpenDetail}
                        onPatchPr={onPatchPr}
                        onSelectRepo={onSelectRepo}
                        minimized={isCardMinimized}
                        onToggleMinimize={() => handleToggleCardMinimize(pr.prKey)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, pr.prKey)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
