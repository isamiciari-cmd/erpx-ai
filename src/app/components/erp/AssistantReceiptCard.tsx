import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  actOnAssistantReceipt, businessAssistantErrorMessage, type AssistantReceiptProposal,
} from '../../../services/aiGatewayService';
import { Button, FormField } from './WorkspaceUI';

const methods = ['cash', 'card', 'mada', 'apple_pay', 'bank_transfer'] as const;
export default function AssistantReceiptCard({ initial }: { initial: AssistantReceiptProposal }) {
  const { t, i18n } = useTranslation('workspace');
  const [proposal, setProposal] = useState(initial);
  const [method, setMethod] = useState(initial.preferredMethod ?? '');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [currentDue, setCurrentDue] = useState<string>();
  const [error, setError] = useState('');
  const lock = useRef(false);
  const receipt = (key: string) => t(`assistant.receipt.${key}`);
  const finished = ['confirmed','cancelled','closed','settled'].includes(notice);
  const execute = async (action: 'confirm_receipt' | 'cancel_receipt') => {
    if (lock.current || finished) return;
    lock.current = true;
    setBusy(true);
    setError('');
    if (action === 'confirm_receipt') setSubmitted(true);
    try {
      const result = await actOnAssistantReceipt(proposal.operationId, action,
        action === 'confirm_receipt' ? method : undefined, reference.trim());
      setNotice(result.status);
      setCurrentDue(result.currentDue);
      if (result.status === 'changed') {
        setSubmitted(false);
        if (result.proposal) setProposal(result.proposal);
        else setNotice('closed');
      }
    } catch (cause) {
      setError(businessAssistantErrorMessage(cause, i18n.resolvedLanguage ?? i18n.language));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const prefix = `receipt-${initial.operationId}`;
  return <section className="mt-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4" aria-label={receipt('review')}>
    <h3 className="mb-3 font-semibold">{receipt('review')}</h3>
    <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
      <dt>{receipt('invoice')}</dt><dd><bdi dir="ltr">{proposal.invoiceNumber}</bdi></dd>
      <dt>{receipt('branch')}</dt><dd><bdi>{proposal.branch}</bdi></dd>
      <dt>{receipt('amount')}</dt><dd><bdi dir="ltr">{proposal.amount} {proposal.currency}</bdi></dd>
    </dl>
    {notice && <p role="status" className="mb-2">{receipt(notice)}{currentDue !== undefined && <bdi dir="ltr"> {currentDue}</bdi>}</p>}
    {error && <p role="alert" className="ws-inline-message ws-warning mb-2">{error}</p>}
    {!finished && <>
      <FormField label={receipt('method')} htmlFor={prefix}>
        <select id={prefix} className="ws-input" value={method} onChange={event => setMethod(event.target.value)} disabled={busy || submitted}>
          <option value="">{receipt('select')}</option>
          {methods.map(value => <option key={value} value={value}>{receipt(value)}</option>)}
        </select>
      </FormField>
      {method && method !== 'cash' && <FormField label={receipt('reference')} htmlFor={prefix + '-ref'}>
        <input id={prefix + '-ref'} className="ws-input" maxLength={100} value={reference} onChange={event => setReference(event.target.value)} disabled={busy || submitted} />
      </FormField>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" disabled={busy || !method || (method !== 'cash' && !reference.trim())} onClick={() => void execute('confirm_receipt')}>{receipt('confirm')}</Button>
        <Button disabled={busy || submitted} onClick={() => void execute('cancel_receipt')}>{receipt('cancel')}</Button>
      </div>
    </>}
  </section>;
}
