import { useTranslation } from 'react-i18next';

export function useLocalizedCopy() {
  const { t } = useTranslation('finalReview');
  return (source: string | undefined) =>
    source ? t(source, { defaultValue: source, keySeparator: false, nsSeparator: false }) : '';
}
