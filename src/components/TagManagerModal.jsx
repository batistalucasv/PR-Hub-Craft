import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { TAG_COLORS, getTagStyle } from '../utils/prHelpers.js';
import { localizeTagLabel, useI18n } from '../i18n.jsx';

export default function TagManagerModal({
  open,
  customTags,
  onClose,
  onSaveTag,
  onDeleteTag,
}) {
  const { lang, t } = useI18n();
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('indigo');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSaveTag({ label: trimmed, color });
      setLabel('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              {t('Manage Tags', 'Gerenciar Tags')}
            </h2>
            <p className="text-xs text-zinc-400">
              {t(
                'Create custom tags to organize your PR workflow.',
                'Crie tags personalizadas para organizar seu fluxo de PRs.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-xl border border-white/10 bg-zinc-900/60 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              {t('New Tag', 'Nova Tag')}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t(
                'e.g. ⚡ Release Blocker, 🔍 Review Later',
                'Ex: ⚡ Bloqueia Release, 🔍 Revisar Depois'
              )}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TAG_COLORS).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  title={lang === 'en' ? meta.nameEn : meta.name}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    color === key
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-white/15 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded-full ${meta.dot}`} />
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving || !label.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('Create', 'Criar')}
            </button>
          </div>
        </form>

        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {(!customTags || customTags.length === 0) ? (
            <p className="py-6 text-center text-xs text-zinc-500">
              {t(
                'No custom tags yet. Create your first tag above!',
                'Nenhuma tag criada ainda. Crie sua primeira tag acima!'
              )}
            </p>
          ) : (
            customTags.map((tag) => {
              const style = getTagStyle(tag.color);
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2"
                >
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.pill}`}
                  >
                    {localizeTagLabel(tag, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteTag(tag.id)}
                    className="rounded-lg p-1 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300"
                    title={t('Delete tag', 'Excluir tag')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
