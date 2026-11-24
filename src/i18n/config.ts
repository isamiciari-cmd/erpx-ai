import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import ar from './ar.json';
import { workspaceResources } from './workspace';
import { operationsResources } from './operations';
import { financeResources } from './finance';
import { administrationResources } from './administration';
import { finalReviewArabic } from './finalReview';

const applyLanguage = (language: string) => {
  const ar = language.startsWith('ar');
  document.documentElement.lang = ar ? 'ar' : 'en';
  document.documentElement.dir = ar ? 'rtl' : 'ltr';
  document.body.dir = ar ? 'rtl' : 'ltr';
  document.documentElement.style.removeProperty('font-family');
  document.body.style.removeProperty('font-family');
  localStorage.setItem('language', ar ? 'ar' : 'en');
};
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
        workspace: workspaceResources.en,
        operations: operationsResources.en,
        finance: financeResources.en,
        administration: administrationResources.en,
        finalReview: {},
      },
      ar: {
        translation: ar,
        workspace: workspaceResources.ar,
        operations: operationsResources.ar,
        finance: financeResources.ar,
        administration: administrationResources.ar,
        finalReview: finalReviewArabic,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    nonExplicitSupportedLngs: true,
    lng: localStorage.getItem('language') || undefined,
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  });
i18n.on('languageChanged', applyLanguage);
applyLanguage(i18n.resolvedLanguage || i18n.language || 'en');
export default i18n;
