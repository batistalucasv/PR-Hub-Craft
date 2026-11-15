import React from 'react';
import {
  Crosshair,
  Eye,
  AlertTriangle,
  MessageSquareWarning,
  Rocket,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useI18n } from '../i18n.jsx';

export default function StatsBar({ stats, activeQuickFilter, onSelectQuickFilter }) {
  const { t } = useI18n();
  if (!stats) return null;

  const cards = [
    {
      id: 'focus',
      label: t('Focus Queue', 'Fila de Foco'),
      sublabel: t('Work on today', 'Para trabalhar hoje'),
      count: stats.focus || 0,
      icon: Crosshair,
      activeBorder: 'border-amber-500/50 bg-amber-500/10',
      iconColor: 'text-amber-400',
      countColor: 'text-amber-200',
    },
    {
      id: 'problema',
      label: t('Issues / Problem', 'Problema'),
      sublabel: t('Conflict or CI failing', 'Conflito ou CI'),
      count:
        stats.problema != null
          ? stats.problema
          : (stats.corrigir_conflito_ci || 0),
      icon: AlertTriangle,
      activeBorder: 'border-rose-500/50 bg-rose-500/10',
      iconColor: 'text-rose-400',
      countColor: 'text-rose-200',
    },
    {
      id: 'revisar',
      label: t('To Review', 'Revisar'),
      sublabel: t('Feedback & reviews', 'Feedback e revisões'),
      count:
        stats.revisar != null
          ? stats.revisar
          : ((stats.resolver_feedback || 0) + (stats.revisar || 0)),
      icon: Eye,
      activeBorder: 'border-sky-500/50 bg-sky-500/10',
      iconColor: 'text-sky-400',
      countColor: 'text-sky-200',
    },
    {
      id: 'finalizado',
      label: t('Finalized', 'Finalizado'),
      sublabel: t('Ready & addressed', 'Prontas / corrigidas'),
      count:
        stats.finalizado != null
          ? stats.finalizado
          : (stats.finalizar || 0),
      icon: Rocket,
      activeBorder: 'border-amber-500/50 bg-amber-500/10',
      iconColor: 'text-amber-400',
      countColor: 'text-amber-200',
    },
    {
      id: 'revisado',
      label: t('Reviewed', 'Revisado'),
      sublabel: t('Awaiting response', 'Aguardando retorno'),
      count:
        stats.revisado != null
          ? stats.revisado
          : (stats.aguardando || 0),
      icon: Clock,
      activeBorder: 'border-violet-500/50 bg-violet-500/10',
      iconColor: 'text-violet-400',
      countColor: 'text-violet-200',
    },
    {
      id: 'aprovado',
      label: t('Approved', 'Aprovado'),
      sublabel: t('Ready to merge', 'Prontas para merge'),
      count: stats.aprovado || 0,
      icon: CheckCircle2,
      activeBorder: 'border-teal-500/50 bg-teal-500/10',
      iconColor: 'text-teal-400',
      countColor: 'text-teal-200',
    },
  ];

  return (
    <section className="w-full px-3 pt-4 sm:px-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeQuickFilter === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectQuickFilter(isActive ? null : card.id)}
              className={`group flex flex-col justify-between rounded-2xl border p-3 text-left transition ${
                isActive
                  ? `${card.activeBorder} shadow-lg`
                  : 'border-white/10 bg-zinc-900/60 hover:border-white/20 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">{card.label}</span>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className={`text-2xl font-bold tracking-tight ${card.countColor}`}>
                  {card.count}
                </span>
                <span className="truncate text-[11px] text-zinc-500 group-hover:text-zinc-400">
                  {card.sublabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
