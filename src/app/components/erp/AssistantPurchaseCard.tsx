import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  actOnAssistantPurchase,
  businessAssistantErrorMessage,
  type AssistantPurchaseProposal,
} from '../../../services/aiGatewayService';
import { Button, FormField, useWorkspaceFormat } from './WorkspaceUI';

export default function AssistantPurchaseCard({ proposal }: { proposal: AssistantPurchaseProposal }) {
  const { isRtl, locale } = useWorkspaceFormat();
  const t = (en: string, ar: string) => isRtl ? ar : en;
  const [warehouse, setWarehouse] = useState(proposal.stock[0].warehouse_id);
  const [supplier, setSupplier] = useState('');
  const [requester, setRequester] = useState('');
  const [lines, setLines] = useState<Record<string, number>>({});
  const [review, setReview] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [path, setPath] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stock = proposal.stock.filter(row => row.warehouse_id === warehouse);
  const warehouses = new Map(proposal.stock.map(row => [row.warehouse_id, row.warehouse]));
  const updateLine = (id: string, quantity: number) => setLines(current => {
    const next = { ...current };
    if (quantity) next[id] = quantity;
    else delete next[id];
    return next;
  });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !supplier.trim() || !requester.trim() || !Object.keys(lines).length) return;
    if (!review) {
      setReview(true);
      return;
    }
    setAttempted(true);
    setBusy(true);
    setError('');
    try {
      setPath(await actOnAssistantPurchase(proposal.operationId, { warehouse, supplier, requester, lines }));
    } catch (cause) {
      setError(businessAssistantErrorMessage(cause, locale));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await actOnAssistantPurchase(proposal.operationId);
      setCancelled(true);
    } catch (cause) {
      setError(businessAssistantErrorMessage(cause, locale));
    } finally {
      setBusy(false);
    }
  }
  return <section className="ws-inline-message space-y-3" aria-label={t('Purchase draft', 'مسودة طلب شراء')}>
    <h3 className="font-semibold">{t('Purchase draft', 'مسودة طلب شراء')}</h3>
    <p>{proposal.branch}</p>
    {path ? <Link className="underline" to={path}>{t('Open purchase draft', 'فتح مسودة طلب الشراء')}</Link>
      : cancelled ? <p role="status">{t('Draft cancelled.', 'أُلغيت المسودة.')}</p>
      : <form className="space-y-3" onSubmit={submit}>
        <fieldset disabled={busy || review} className="space-y-3">
          <label className="block">{t('Warehouse', 'المستودع')}
            <select className="ws-input" value={warehouse} onChange={event => {
              setWarehouse(event.target.value);
              setLines({});
            }}>{[...warehouses].map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>
          </label>
          <FormField label={t('Supplier', 'المورد')} htmlFor={proposal.operationId + '-supplier'}>
            <input className="ws-input" id={proposal.operationId + '-supplier'} maxLength={120} required value={supplier}
              onChange={event => setSupplier(event.target.value)} />
          </FormField>
          <FormField label={t('Requested by', 'مقدّم الطلب')} htmlFor={proposal.operationId + '-requester'}>
            <input className="ws-input" id={proposal.operationId + '-requester'} maxLength={120} required value={requester}
              onChange={event => setRequester(event.target.value)} />
          </FormField>
          <ul className="space-y-2">
            {stock.filter(row => !review || lines[row.product_id]).map(row => <li key={row.product_id} className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(lines[row.product_id])}
                  onChange={event => updateLine(row.product_id, event.target.checked ? Math.max(1, row.minimum - row.available) : 0)} />
                <bdi>{row.sku}</bdi>
              </label>
              <span>{t('Available / minimum', 'المتاح / الحد الأدنى')} <bdi>{row.available} / {row.minimum}</bdi></span>
              {lines[row.product_id] > 0 && <input type="number" className="ws-input max-w-28" min={1} max={999999}
                required aria-label={t('Quantity', 'الكمية') + ' ' + row.sku}
                value={lines[row.product_id]}
                onChange={event => updateLine(row.product_id, Math.max(1, Number(event.target.value)))} />}
            </li>)}
          </ul>
        </fieldset>
        {review && <p>{t('Review the selected quantities before saving the draft.', 'راجع الكميات المختارة قبل حفظ المسودة.')}</p>}
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" loading={busy} disabled={!Object.keys(lines).length}>
            {attempted ? t('Retry saving', 'إعادة محاولة الحفظ') : review ? t('Confirm draft', 'تأكيد حفظ المسودة') : t('Review draft', 'مراجعة المسودة')}
          </Button>
          {review && !attempted && <Button type="button" onClick={() => setReview(false)}>{t('Edit', 'تعديل')}</Button>}
          {!attempted && <Button type="button" disabled={busy} onClick={() => void cancel()}>{t('Cancel', 'إلغاء')}</Button>}
        </div>
      </form>}
  </section>;
}
