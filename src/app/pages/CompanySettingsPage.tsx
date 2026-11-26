import CompanyLogoPanel from '../components/erp/CompanyLogoPanel';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Check, Globe2, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { supabase, isDemoMode } from '../../lib/supabase';
import { administrationErrorKey } from '../../i18n/administration';
import {
  Button,
  ErrorState,
  FormField,
  LoadingSkeleton,
  PageHeader,
  Panel,
  StatusBadge,
  useWorkspaceFormat,
} from '../components/erp/WorkspaceUI';

type CompanyForm = {
  name: string;
  legal_name: string;
  tax_id: string;
  currency: string;
  timezone: string;
};
const empty: CompanyForm = { name: '', legal_name: '', tax_id: '', currency: '', timezone: '' };
function fromCompany(row: Record<string, unknown>): CompanyForm {
  return Object.fromEntries(
    Object.keys(empty).map((key) => [key, typeof row[key] === 'string' ? row[key] : '']),
  ) as CompanyForm;
}
export function validateCompanySettings(form: CompanyForm) {
  const errors: Partial<Record<keyof CompanyForm, string>> = {};
  if (!form.name.trim() || form.name.trim().length > 255) errors.name = 'settings.invalidName';
  if (!/^[A-Z]{3}$/.test(form.currency)) errors.currency = 'settings.invalidCurrency';
  try {
    new Intl.DateTimeFormat('en', { timeZone: form.timezone }).format();
    if (!form.timezone.trim()) throw new Error();
  } catch {
    errors.timezone = 'settings.invalidTimezone';
  }
  return errors;
}

export default function CompanySettingsPage() {
  const { t } = useTranslation('administration');
  const { isRtl } = useWorkspaceFormat();
  const { user, refreshAccess } = useAuth();
  const { hasRole } = usePermissions();
  const companyId = user?.company_id;
  const canSave =
    ['owner', 'super_admin', 'admin'].includes(user?.role?.name ?? '') &&
    ['owner', 'super_admin', 'admin'].some(hasRole);
  const [form, setForm] = useState<CompanyForm>(empty);
  const [original, setOriginal] = useState<CompanyForm>(empty);
  const [company, setCompany] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyForm, string>>>({});
  const generation = useRef(0);
  const saveLock = useRef(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(original);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      if (!companyId || isDemoMode) throw new Error();
      // Optional contact and language fields vary by installation: select the
      // actual row rather than assuming that newer schema columns exist.
      const { data, error: failure } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      if (failure) throw failure;
      if (!data || data.id !== companyId) throw new Error();
      if (request !== generation.current) return;
      const next = fromCompany(data);
      setCompany(data);
      setForm(next);
      setOriginal(next);
      setErrors({});
    } catch (cause) {
      if (request === generation.current) setError(administrationErrorKey(cause));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    setForm(empty);
    setOriginal(empty);
    setCompany(null);
    setNotice(false);
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useUnsavedChanges(dirty, t('common.discard'), { title: t('company.title'), values: form, baseline: original });
  const change = (key: keyof CompanyForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setNotice(false);
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };
  const cancel = () => {
    if (saving || (dirty && !window.confirm(t('common.discard')))) return;
    setForm(original);
    setErrors({});
    setError('');
    setNotice(false);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!companyId || !company || !dirty || !canSave || saveLock.current) return;
    const validation = validateCompanySettings(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const request = generation.current;
    const clean = {
      ...form,
      name: form.name.trim(),
      legal_name: form.legal_name.trim(),
      tax_id: form.tax_id.trim(),
      timezone: form.timezone.trim(),
    };
    saveLock.current = true;
    setSaving(true);
    setError('');
    setNotice(false);
    try {
      const { data, error: failure } = await supabase.rpc('update_company_settings', {
        p_company_id: companyId,
        p_name: clean.name,
        p_legal_name: clean.legal_name,
        p_tax_id: clean.tax_id,
        p_currency: clean.currency,
        p_timezone: clean.timezone,
      });
      if (failure) throw failure;
      if (!data || data.id !== companyId) throw new Error();
      if (request !== generation.current) return;
      const saved = fromCompany(data);
      setCompany(data);
      setForm(saved);
      setOriginal(saved);
      setNotice(true);
      // The write has succeeded even if refreshing the app-shell display fails.
      void refreshAccess().catch(() => undefined);
    } catch (cause) {
      if (request === generation.current) {
        const currencyLocked =
          cause &&
          typeof cause === 'object' &&
          'message' in cause &&
          typeof cause.message === 'string' &&
          /base currency after invoices|currency after invoices/i.test(cause.message);
        setError(
          currencyLocked
            ? 'settings.currencyLocked'
            : administrationErrorKey(cause, 'common.saveFailed'),
        );
      }
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  const settings =
    company?.settings && typeof company.settings === 'object' && !Array.isArray(company.settings)
      ? (company.settings as Record<string, unknown>)
      : {};
  const companyLanguage =
    typeof company?.language === 'string'
      ? company.language
      : typeof settings.language === 'string'
        ? settings.language
        : null;
  const contactKeys = [
    'contact_email',
    'contact_phone',
    'website',
    'address',
    'city',
    'country',
  ] as const;
  const labels = {
    contact_email: 'contactEmail',
    contact_phone: 'contactPhone',
    website: 'website',
    address: 'address',
    city: 'city',
    country: 'country',
  };
  const contact = contactKeys.filter(
    (key) => typeof company?.[key] === 'string' && String(company[key]).trim(),
  );

  return (
    <section className="ws-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader
        eyebrow={t('common.administration')}
        title={t('settings.title')}
        description={t('settings.description')}
        actions={
          company && canSave ? (
            <Button
              type="submit"
              variant="primary"
              form="company-settings-form"
              loading={saving}
              disabled={!dirty || loading}
              icon={<Save size={16} />}
            >
              {t('common.save')}
            </Button>
          ) : (
            <StatusBadge>{t('common.readonly')}</StatusBadge>
          )
        }
      />
      {error && (
        <ErrorState message={t(error)} onRetry={!company ? () => void load() : undefined} />
      )}
      {notice && (
        <p role="status" className="ws-inline-message ws-success flex items-center gap-2">
          <Check size={17} />
          {t('settings.saved')}
        </p>
      )}
      {!canSave && <p className="ws-inline-message">{t('settings.readOnlyHint')}</p>}
      {loading ? (
        <LoadingSkeleton cards={2} rows={4} />
      ) : (
        company && (
          <form id="company-settings-form" onSubmit={save} className="space-y-6">
            <Panel
              title={t('settings.identity')}
              description={t('settings.identityHint')}
              actions={<Building2 size={20} className="ws-muted" />}
            >
              <div className="ws-form-grid">
                <FormField
                  label={t('settings.name')}
                  htmlFor="company-name"
                  error={errors.name ? t(errors.name) : undefined}
                >
                  <input
                    id="company-name"
                    className="ws-input"
                    required
                    maxLength={255}
                    autoComplete="organization"
                    disabled={!canSave || saving}
                    value={form.name}
                    onChange={(event) => change('name', event.target.value)}
                    aria-invalid={!!errors.name}
                  />
                </FormField>
                <FormField label={t('settings.legalName')} htmlFor="company-legal-name">
                  <input
                    id="company-legal-name"
                    className="ws-input"
                    maxLength={255}
                    disabled={!canSave || saving}
                    value={form.legal_name}
                    onChange={(event) => change('legal_name', event.target.value)}
                  />
                </FormField>
                <FormField label={t('settings.taxId')} htmlFor="company-tax-id">
                  <input
                    id="company-tax-id"
                    className="ws-input"
                    dir="ltr"
                    maxLength={100}
                    disabled={!canSave || saving}
                    value={form.tax_id}
                    onChange={(event) => change('tax_id', event.target.value)}
                  />
                </FormField>
              </div>
            </Panel>
            {companyId && <CompanyLogoPanel key={companyId} companyId={companyId} canEdit={canSave} arabic={isRtl} />}
            <Panel
              title={t('settings.regional')}
              description={t('settings.regionalHint')}
              actions={<Globe2 size={20} className="ws-muted" />}
            >
              <div className="ws-form-grid">
                <FormField
                  label={t('settings.currency')}
                  htmlFor="company-currency"
                  hint={t('settings.currencyHint')}
                  error={errors.currency ? t(errors.currency) : undefined}
                >
                  <input
                    id="company-currency"
                    className="ws-input"
                    dir="ltr"
                    required
                    maxLength={3}
                    pattern="[A-Z]{3}"
                    disabled={!canSave || saving}
                    value={form.currency}
                    onChange={(event) => change('currency', event.target.value.toUpperCase())}
                    aria-invalid={!!errors.currency}
                  />
                </FormField>
                <FormField
                  label={t('settings.timezone')}
                  htmlFor="company-timezone"
                  error={errors.timezone ? t(errors.timezone) : undefined}
                >
                  <input
                    id="company-timezone"
                    className="ws-input"
                    dir="ltr"
                    required
                    maxLength={100}
                    disabled={!canSave || saving}
                    value={form.timezone}
                    onChange={(event) => change('timezone', event.target.value)}
                    aria-invalid={!!errors.timezone}
                  />
                </FormField>
                <FormField
                  label={t('settings.language')}
                  htmlFor="company-language"
                  hint={t('settings.languageHint')}
                >
                  <input
                    id="company-language"
                    className="ws-input"
                    readOnly
                    value={companyLanguage || t('settings.noLanguage')}
                  />
                </FormField>
              </div>
            </Panel>
            <Panel
              title={t('settings.contact')}
              description={t('settings.contactHint')}
              actions={<StatusBadge>{t('common.readonly')}</StatusBadge>}
            >
              {contact.length ? (
                <dl className="ws-form-grid">
                  {contact.map((key) => (
                    <div key={key}>
                      <dt className="ws-muted text-sm">{t(`settings.${labels[key]}`)}</dt>
                      <dd className="mt-2 break-words font-medium">
                        <bdi>{String(company[key])}</bdi>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="ws-muted text-sm">{t('settings.noContact')}</p>
              )}
            </Panel>
            {canSave && (
              <div className="ws-card flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className={dirty ? 'font-medium' : 'ws-muted text-sm'}>
                    {t(dirty ? 'common.unsaved' : 'settings.saveHint')}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving || !dirty}
                    onClick={cancel}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={!dirty}
                    icon={<Save size={16} />}
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )
      )}
    </section>
  );
}
