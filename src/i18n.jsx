import React, { createContext, useContext, useEffect, useState } from 'react';

const LANG_STORAGE_KEY = 'pr-hub-craft-lang';

const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (en, pt) => en,
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'pt' || saved === 'en' ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  function toggleLang() {
    setLang((prev) => (prev === 'en' ? 'pt' : 'en'));
  }

  function t(en, pt) {
    return lang === 'en' ? en : pt;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

const EXACT_BACKEND_TRANSLATIONS = {
  'SLA pausado': 'SLA paused',
  'Aguardando revisor / maintainer': 'Waiting for reviewer / maintainer',
  'Aguardando revisão do maintainer': 'Waiting for maintainer review',
  'CI em execução; aguardando revisão': 'CI running; awaiting review',
  'Conflito de merge com a branch base': 'Merge conflict with base branch',
  'Conflito simples (Quick Win)': 'Quick-win conflict',
  'Checks de CI falhando': 'CI checks failing',
  'Changes requested pendente': 'Pending changes requested',
  'Novos comentários após último commit': 'New comments after latest commit',
  'Aprovada e checks verdes — pronta para merge':
    'Approved and checks green — ready to merge',
  'Draft sem conflitos/erros — pronto para revisar e publicar':
    'Draft without conflicts/errors — ready to review & publish',
  'Aguardando sua revisão': 'Waiting for your review',
  'Você aprovou — aguardando merge': 'You approved — waiting for merge',
  'Seu review ainda pendente': 'Your review still pending',
  'PR de terceiros aguardando sua revisão há 7+ dias':
    'External PR waiting for your review for 7+ days',
  'Aguardando sua resposta há 30+ dias': 'Waiting for your reply for 30+ days',
  'Aguardando sua resposta há 14+ dias': 'Waiting for your reply for 14+ days',
  'Aguardando sua resposta há 7+ dias': 'Waiting for your reply for 7+ days',
  'Você é o próximo a agir': 'Your turn to act',
  Hoje: 'Today',
};

const TAG_LABEL_EN = {
  urgente: '🔥 Urgent',
  'aguardando-upstream': '👀 Waiting',
  coderabbit: '🤖 Review CodeRabbit',
  'testar-local': '🧪 Test Local',
  doc: '📝 Docs',
  'pronto-merge': '✅ Almost there',
  'review-pendente': '🔍 Pending Review',
  conflito: '⚔️ Conflict',
};

export function localizeTagLabel(tag, lang = 'en') {
  if (!tag) return '';
  if (lang !== 'en') return tag.label;
  return TAG_LABEL_EN[tag.id] || tag.label;
}

export function localizeBackendText(text, lang = 'en') {
  if (!text || lang !== 'en') return text;
  if (EXACT_BACKEND_TRANSLATIONS[text]) {
    return EXACT_BACKEND_TRANSLATIONS[text];
  }

  let match = text.match(/^(\d+)d sem resposta$/);
  if (match) return `${match[1]}d without reply`;

  match = text.match(/^(\d+)d parado$/);
  if (match) return `${match[1]}d idle`;

  match = text.match(/^(\d+)d esperando review$/);
  if (match) return `${match[1]}d waiting review`;

  match = text.match(/^(\d+)d aberta$/);
  if (match) return `${match[1]}d open`;

  match = text.match(/^Revisão solicitada a você \((.+)\)$/);
  if (match) return `Review requested from you (${match[1]})`;

  match = text.match(/^PR de @([^ ]+) com sua participação$/);
  if (match) return `@${match[1]}'s PR with your participation`;

  return text;
}
