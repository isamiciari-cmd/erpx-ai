import { useTranslation } from 'react-i18next';
import BusinessAssistantPage from '../components/erp/BusinessAssistantPage';

const titles: Record<string, { ar: string; en: string }> = {
  'AI Predictions': { ar: 'مساعد تحليل السيناريوهات', en: 'Scenario analysis assistant' },
  'AI Recommendations': { ar: 'مساعد التوصيات', en: 'Recommendations assistant' },
  'AI Alerts': { ar: 'مساعد مراجعة التنبيهات', en: 'Alerts review assistant' },
};

export default function AIWorkspacePage({ title = 'Business assistant' }: { title?: string }) {
  const { i18n } = useTranslation();
  const ar = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  return (
    <BusinessAssistantPage
      title={titles[title]?.[ar ? 'ar' : 'en'] || (ar ? 'مساعد الأعمال' : title)}
    />
  );
}
