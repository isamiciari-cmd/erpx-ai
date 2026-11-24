import {
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Inbox,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger';
export function useWorkspaceFormat() {
  const { i18n } = useTranslation('workspace');
  const { user } = useAuth();
  const isRtl = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const locale = isRtl ? 'ar-SA' : 'en-GB';
  const timeZone =
    (user?.company as { timezone?: string } | undefined)?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useMemo(
    () => ({
      locale,
      isRtl,
      timeZone,
      money: (value: number | string, currency = user?.company?.currency || 'SAR') =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          maximumFractionDigits: 2,
        }).format(Number(value)),
      number: (value: number | string) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(Number(value)),
      date: (value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
        if (!value) return '—';
        // Date-only business documents must not move to a different calendar day.
        const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
        const date =
          value instanceof Date ? value : new Date(dateOnly ? value + 'T12:00:00Z' : value);
        if (!Number.isFinite(date.getTime())) return '—';
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: dateOnly ? 'UTC' : timeZone,
          ...options,
        }).format(date);
      },
    }),
    [locale, isRtl, timeZone, user?.company?.currency],
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="ws-page-header">
      <div className="ws-page-header-main">
        {eyebrow && <p className="ws-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="ws-page-description">{description}</p>}
        {children}
      </div>
      {actions && <div className="ws-page-actions">{actions}</div>}
    </header>
  );
}
export function Button({
  children,
  variant = 'secondary',
  loading,
  disabled,
  icon,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type={type}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ws-btn ws-btn-${variant} ${className}`}
    >
      {loading ? <Loader2 size={16} className="ws-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`ws-stat ws-tone-${tone}`}>
      <div className="ws-stat-top">
        <span>{label}</span>
        {icon && (
          <span className="ws-stat-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="ws-stat-value" dir="auto">
        {value}
      </div>
      {hint && <div className="ws-stat-hint">{hint}</div>}
    </div>
  );
}
export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { title?: string; description?: string; actions?: ReactNode }) {
  return (
    <section {...props} className={`ws-card ${className}`}>
      {(title || description || actions) && (
        <div className="ws-panel-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p className="ws-muted">{description}</p>}
          </div>
          {actions && <div className="ws-page-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
export function FilterBar({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const { t } = useTranslation('workspace');
  return (
    <div
      {...props}
      role="group"
      aria-label={t('common.filters')}
      className={`ws-filterbar ${className}`}
    >
      {children}
    </div>
  );
}
const tones: Record<string, Tone> = {
  active: 'success',
  paid: 'success',
  posted: 'success',
  approved: 'success',
  completed: 'success',
  issued: 'success',
  sent: 'success',
  pass: 'success',
  success: 'success',
  overdue: 'danger',
  rejected: 'danger',
  fail: 'danger',
  failed: 'danger',
  inactive: 'neutral',
  cancelled: 'neutral',
  draft: 'neutral',
  skipped: 'neutral',
  idle: 'neutral',
  suspended: 'warning',
  submitted: 'warning',
  partial: 'warning',
  pending: 'warning',
  running: 'warning',
  warn: 'warning',
  on_hold: 'warning',
};
export function StatusBadge({
  status = '',
  children,
  tone,
}: {
  status?: string;
  children?: ReactNode;
  tone?: Tone;
}) {
  const { t } = useTranslation('workspace');
  const normalized = status.toLowerCase();
  const resolvedTone = tone || tones[normalized] || 'neutral';
  const Icon = resolvedTone === 'success' ? CheckCircle2
    : resolvedTone === 'warning' ? Clock3
    : resolvedTone === 'danger' ? AlertCircle
    : Circle;
  return (
    <span className={`ws-badge ws-tone-${resolvedTone}`}>
      <Icon size={13} aria-hidden="true" />
      {children || t(`status.${normalized}`, { defaultValue: status.replaceAll('_', ' ') })}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="ws-empty">
      <span className="ws-empty-icon" aria-hidden="true">
        {icon || <Inbox size={25} />}
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="ws-empty-action">{action}</div>}
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
  title,
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  const { t } = useTranslation('workspace');
  return (
    <div className="ws-error-state" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <strong>{title || t('common.unableToLoad')}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} icon={<RefreshCw size={15} />}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
export function LoadingSkeleton({ rows = 5, cards = 0 }: { rows?: number; cards?: number }) {
  const { t } = useTranslation('workspace');
  return (
    <div role="status" aria-label={t('common.loading')} className="ws-loading">
      <span className="sr-only">{t('common.loading')}</span>
      {cards > 0 && (
        <div className="ws-stats">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="ws-skeleton ws-skeleton-card" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ws-skeleton ws-skeleton-row" />
      ))}
    </div>
  );
}
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const directInput =
    isValidElement(children) && ['input', 'select', 'textarea'].includes(String(children.type));
  const control = directInput
    ? (children as ReactElement<{
        id?: string;
        'aria-describedby'?: string;
        'aria-invalid'?: boolean;
      }>)
    : null;
  const id = htmlFor || control?.props.id || generatedId;
  const describedBy =
    [control?.props['aria-describedby'], hint ? id + '-hint' : '', error ? id + '-error' : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className={`ws-field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {control
        ? cloneElement(control, {
            id,
            'aria-invalid': error ? true : control.props['aria-invalid'],
            'aria-describedby': describedBy,
          })
        : children}
      {hint && (
        <p className="ws-field-hint" id={id + '-hint'}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ws-field-error" id={id + '-error'} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function DetailDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const { t, i18n } = useTranslation('workspace');
  const rtl = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const descriptionId = useId();
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="ws-overlay" />
        <Dialog.Content
          dir={rtl ? 'rtl' : 'ltr'}
          className={`ws-drawer ${wide ? 'ws-drawer-wide' : ''}`}
          aria-describedby={description ? descriptionId : undefined}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = opener.current?.isConnected
              ? opener.current
              : document.getElementById('workspace-content');
            target?.focus({ preventScroll: true });
          }}
        >
          <div className="ws-drawer-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description id={descriptionId}>{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ws-icon-btn" aria-label={t('common.close')}>
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>
          <div className="ws-drawer-body">{children}</div>
          {footer && <div className="ws-drawer-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel,
  busy = false,
  variant = 'danger',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  busy?: boolean;
  variant?: 'danger' | 'primary';
}) {
  const { t } = useTranslation('workspace');
  const opener = useRef<HTMLElement | null>(null);
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="ws-overlay" />
        <AlertDialog.Content
          className="ws-confirm"
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = opener.current?.isConnected
              ? opener.current
              : document.getElementById('workspace-content');
            target?.focus({ preventScroll: true });
          }}
        >
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          <div className="ws-page-actions">
            <AlertDialog.Cancel asChild>
              <Button disabled={busy}>{t('common.cancel')}</Button>
            </AlertDialog.Cancel>
            <Button loading={busy} variant={variant} onClick={() => void onConfirm()}>
              {confirmLabel || t('common.confirm')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
export function PermissionGuard({
  permission,
  roles,
  children,
  fallback = null,
}: {
  permission?: string;
  roles?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const auth = useAuth();
  const allowed =
    !!auth.user &&
    !auth.loading &&
    !auth.accessError &&
    (!permission || auth.permissions.some((p) => p.permission_key === permission)) &&
    (!roles?.length || auth.roles.some((r) => roles.includes(r.role_name)));
  return <>{allowed ? children : fallback}</>;
}
export interface TableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  pageSize = 10,
  emptyTitle,
  emptyDescription,
  caption,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  caption?: string;
}) {
  const { t } = useTranslation('workspace');
  const { number } = useWorkspaceFormat();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; descending: boolean }>();
  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key);
    if (!column?.sortValue || !sort) return rows;
    return [...rows].sort((a, b) => {
      const x = column.sortValue!(a);
      const y = column.sortValue!(b);
      return (
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y))) * (sort.descending ? -1 : 1)
      );
    });
  }, [columns, rows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, (current + 1) * pageSize);
  if (!rows.length)
    return (
      <EmptyState title={emptyTitle || t('common.noResults')} description={emptyDescription} />
    );
  return (
    <>
      <div
        className="ws-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={caption || t('common.records')}
      >
        <table className="ws-table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={column.className}
                  aria-sort={
                    sort?.key === column.key
                      ? sort.descending
                        ? 'descending'
                        : 'ascending'
                      : undefined
                  }
                >
                  {column.sortValue ? (
                    <button
                      className="ws-sort"
                      onClick={() => {
                        setSort({
                          key: column.key,
                          descending: sort?.key === column.key && !sort.descending,
                        });
                        setPage(0);
                      }}
                    >
                      {column.label}
                      {sort?.key === column.key ? (
                        sort.descending ? (
                          <ArrowDown size={13} />
                        ) : (
                          <ArrowUp size={13} />
                        )
                      ) : (
                        <ArrowUpDown size={13} />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ws-pagination">
        <span>
          {t('common.showing', {
            from: number(current * pageSize + 1),
            to: number(Math.min((current + 1) * pageSize, rows.length)),
            total: number(rows.length),
          })}
        </span>
        <div className="ws-page-actions">
          <Button
            aria-label={t('common.previous')}
            disabled={!current}
            onClick={() => setPage(current - 1)}
            icon={<ChevronLeft size={16} />}
          />
          <span>
            {number(current + 1)} / {number(pages)}
          </span>
          <Button
            aria-label={t('common.next')}
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
            icon={<ChevronRight size={16} />}
          />
        </div>
      </div>
    </>
  );
}
