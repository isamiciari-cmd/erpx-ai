import { useEffect, useState } from 'react';
import { getCompanyLogo, prepareCompanyLogo, saveCompanyLogo } from '../../../services/printedDocumentsService';
import { Button, FormField, Panel } from './WorkspaceUI';

export default function CompanyLogoPanel({ companyId, canEdit, arabic }: {
  companyId: string;
  canEdit: boolean;
  arabic: boolean;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const title = arabic ? 'شعار الشركة' : 'Company logo';
  const failure = arabic ? 'تعذّر حفظ الشعار أو قراءته.' : 'The logo could not be loaded or saved.';
  useEffect(() => {
    let active = true;
    void getCompanyLogo(companyId).then(
      (value) => { if (active) setImage(value); },
      () => { if (active) setError(failure); },
    ).finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [companyId, failure]);
  async function update(file: File | null) {
    if (!canEdit || pending) return;
    setPending(true);
    setError('');
    try {
      const value = file ? await prepareCompanyLogo(file) : null;
      await saveCompanyLogo(companyId, value);
      setImage(value);
    } catch {
      setError(failure);
    } finally {
      setPending(false);
    }
  }
  return (
    <Panel title={title}>
      {image && <img src={image} alt={title} className="mb-4 max-h-32 max-w-48 object-contain" />}
      {error && <p role="alert" className="ws-inline-message">{error}</p>}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-3">
          <FormField label={image ? (arabic ? 'استبدال الشعار' : 'Replace logo') : (arabic ? 'رفع الشعار' : 'Upload logo')} htmlFor="company-logo">
            <input
              id="company-logo" type="file" className="ws-input" disabled={pending}
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void update(file);
              }}
            />
          </FormField>
          {image && <Button type="button" disabled={pending} onClick={() => void update(null)}>
            {arabic ? 'إزالة الشعار' : 'Remove logo'}
          </Button>}
        </div>
      )}
    </Panel>
  );
}
