import { useTranslation } from 'react-i18next';
import { Button } from './WorkspaceUI';
import { useBusinessAccess } from './BusinessRecordsPage';
import { usePermissions } from '../../../hooks/usePermissions';

const suggestions = [
  ['sales_summary', 'sales'],
  ['find_invoice', 'invoice'],
  ['preview_receipt', 'collect'],
  ['overdue_receivables', 'receivables'],
  ['low_stock', 'inventory'],
  ['preview_purchase', 'purchase'],
  ['shift_summary', 'shift'],
  ['navigation', 'navigation'],
] as const;

export default function AssistantSuggestions({ tools, disabled, onPick }: {
  tools?: string[];
  disabled: boolean;
  onPick: (question: string) => void;
}) {
  const { t } = useTranslation('workspace');
  const cashier = usePermissions().hasRole('cashier');
  const receipt = useBusinessAccess('finance_receivables').canCreate;
  const purchase = useBusinessAccess('purchases_requests').canCreate;
  if (!tools?.length) return null;
  const visible = suggestions.filter(([tool]) => tools.includes(tool) &&
    (!cashier || tool === 'shift_summary' || tool === 'navigation') &&
    (tool !== 'preview_receipt' || receipt) && (tool !== 'preview_purchase' || purchase));
  return <div className="flex flex-wrap gap-2" aria-label={t('assistant.suggested.label')}>
    {visible.map(([tool, key]) => (
      <Button key={tool} type="button" disabled={disabled} onClick={() => onPick(t(`assistant.suggested.${key}Question`))}>
        {t(`assistant.suggested.${key}`)}
      </Button>
    ))}
  </div>;
}
