import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import ar from './ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || undefined,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.body.dir = lng === 'ar' ? 'rtl' : 'ltr';

  // Apply font family based on language
  if (lng === 'ar') {
    document.documentElement.style.fontFamily = "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif";
    document.body.style.fontFamily = "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif";
  } else {
    document.documentElement.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
    document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
  }

  // Force page reload to apply all RTL changes properly
  setTimeout(() => {
    window.location.reload();
  }, 100);
});

const currentLang = i18n.language;
document.documentElement.lang = currentLang;
document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

// Apply font family based on language
if (currentLang === 'ar') {
  document.documentElement.style.fontFamily = "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif";
} else {
  document.documentElement.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
}

export default i18n;
