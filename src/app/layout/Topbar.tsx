import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import {
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  Globe2,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { listInvoices, type Invoice } from '../../services/invoicesService';
import { useTheme } from '../context/ThemeContext';
import { allWorkspaceLinks, workspaceAdminRoles } from './workspaceNavigation';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  useWorkspaceFormat,
} from '../components/erp/WorkspaceUI';

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t, i18n } = useTranslation('workspace');
  const { user, roles, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { date, isRtl, timeZone } = useWorkspaceFormat();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Invoice[]>([]);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const notificationCache = useRef({ company: '', at: 0 });
  const admin = roles.some((role) => workspaceAdminRoles.includes(role.role_name));
  const commands = useMemo(
    () => allWorkspaceLinks().filter((link) => !link.admin || admin),
    [admin],
  );
  const results = commands.filter((link) =>
    `${t('nav.' + link.key)} ${link.path}`.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    setNotifications([]);
    setNotificationError('');
    notificationCache.current = { company: '', at: 0 };
    setSearch('');
    setCommandOpen(false);
  }, [user?.id, user?.company_id]);
  useEffect(() => {
    if (!notificationsOpen || !user?.company_id) return;
    if (
      notificationCache.current.company === user.company_id &&
      Date.now() - notificationCache.current.at < 60000
    )
      return;
    let current = true;
    setNotificationsBusy(true);
    setNotificationError('');
    void listInvoices(user.company_id)
      .then((invoices) => {
        if (!current) return;
        const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
        setNotifications(
          invoices
            .filter(
              (invoice) =>
                ['issued', 'sent', 'partial', 'paid', 'overdue'].includes(
                  invoice.status.toLowerCase(),
                ) &&
                Number(invoice.amount_due) > 0 &&
                invoice.due_date &&
                invoice.due_date < today,
            )
            .sort((a, b) => a.due_date.localeCompare(b.due_date)),
        );
        notificationCache.current = { company: user.company_id, at: Date.now() };
      })
      .catch(() => {
        if (current) setNotificationError(t('shell.notificationError'));
      })
      .finally(() => {
        if (current) setNotificationsBusy(false);
      });
    return () => {
      current = false;
    };
  }, [notificationsOpen, user?.company_id, timeZone, t]);
  async function logout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await signOut();
      navigate('/login');
    } catch {
      setLogoutError(t('shell.logoutError'));
    } finally {
      setLoggingOut(false);
    }
  }
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || t('shell.user');
  const role = user?.role?.display_name || user?.role?.name || t('shell.user');
  return (
    <>
      <header className="erpx-topbar">
        <button
          className="ws-icon-btn erpx-mobile-menu"
          aria-label={t('shell.openNavigation')}
          onClick={onMenu}
        >
          <Menu size={20} />
        </button>
        <div className="erpx-company">
          <div className="erpx-company-icon">
            <Building2 size={17} />
          </div>
          <div className="min-w-0">
            <small>{t('shell.company')}</small>
            <strong title={user?.company?.name}>
              {user?.company?.name || t('shell.companyFallback')}
            </strong>
            {user?.branch?.name && (
              <small title={user.branch.name}>{t('shell.branch')} · <bdi>{user.branch.name}</bdi></small>
            )}
          </div>
        </div>
        <button
          className="erpx-topbar-search"
          onClick={() => setCommandOpen(true)}
          aria-label={t('shell.navigationSearch')}
        >
          <Search size={16} />
          <span>{t('shell.searchPlaceholder')}</span>
          <kbd dir="ltr">⌘ K</kbd>
        </button>
        <div className="erpx-topbar-actions">
          <button
            className="ws-icon-btn"
            aria-label={t('shell.openAssistant')}
            title={t('assistant.title')}
            onClick={() => window.dispatchEvent(new Event('erpx:open-ai'))}
          >
            <Sparkles size={18} />
          </button>
          <Popover.Root open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <Popover.Trigger asChild>
              <button
                className="ws-icon-btn"
                aria-label={t('shell.notifications')}
                title={t('shell.notifications')}
              >
                <Bell size={18} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="ws-popover"
                sideOffset={12}
                align="end"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="ws-popover-header">
                  <h2>{t('shell.notifications')}</h2>
                  <p>{t('shell.notificationsDescription')}</p>
                </div>
                {notificationsBusy ? (
                  <LoadingSkeleton rows={3} />
                ) : notificationError ? (
                  <ErrorState message={notificationError} />
                ) : !notifications.length ? (
                  <EmptyState
                    title={t('shell.noNotifications')}
                    description={t('shell.noNotificationsHint')}
                    icon={<Bell size={22} />}
                  />
                ) : (
                  <div>
                    {notifications.slice(0, 8).map((invoice) => (
                      <Link
                        key={invoice.id}
                        className="ws-menu-item"
                        to="/finance/invoicing"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <span>
                          <span>
                            {t('shell.overdueInvoice', { number: invoice.invoice_number })}
                          </span>
                          <small className="block ws-muted">
                            {t('shell.dueOn', { date: date(invoice.due_date) })}
                          </small>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                <Link
                  to="/finance/invoicing"
                  className="ws-menu-item"
                  onClick={() => setNotificationsOpen(false)}
                >
                  {t('shell.viewNotifications')}
                  <ArrowUpRight size={14} />
                </Link>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <button
            className="ws-icon-btn erpx-theme-toggle"
            onClick={toggleTheme}
            aria-label={t(theme === 'dark' ? 'shell.light' : 'shell.dark')}
            title={t('shell.theme')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="ws-icon-btn"
            onClick={() => void i18n.changeLanguage(isRtl ? 'en' : 'ar')}
            aria-label={t('shell.language')}
            title={isRtl ? 'English' : 'العربية'}
          >
            <Globe2 size={18} />
          </button>
          <span className="erpx-topbar-divider" />
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="erpx-account-button" aria-label={t('shell.menu')}>
                <span className="erpx-avatar">{name.slice(0, 1)}</span>
                <span className="erpx-account-name">
                  {name}
                  <span className="erpx-account-role">{role}</span>
                </span>
                <ChevronDown size={12} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="ws-popover"
                sideOffset={12}
                align="end"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="ws-popover-header">
                  <h2>{name}</h2>
                  <p dir="ltr">{user?.email}</p>
                </div>
                {admin && (
                  <Link className="ws-menu-item" to="/settings">
                    <Settings size={16} />
                    {t('shell.settings')}
                  </Link>
                )}
                <button className="ws-menu-item" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  {t(theme === 'dark' ? 'shell.light' : 'shell.dark')}
                </button>
                <button
                  className="ws-menu-item"
                  onClick={() => void logout()}
                  disabled={loggingOut}
                >
                  <LogOut size={16} />
                  {t('shell.logout')}
                </button>
                {logoutError && (
                  <p role="alert" className="ws-inline-message ws-error">
                    {logoutError}
                  </p>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </header>
      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="ws-overlay" />
          <Dialog.Content
            className="ws-search-dialog"
            dir={isRtl ? 'rtl' : 'ltr'}
            aria-describedby={undefined}
          >
            <div className="ws-panel-header">
              <Dialog.Title>{t('shell.searchHint')}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="ws-icon-btn" aria-label={t('common.close')}>
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <input
              autoFocus
              className="ws-input"
              aria-label={t('shell.navigationSearch')}
              placeholder={t('shell.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) {
                  navigate(results[0].path);
                  setCommandOpen(false);
                  setSearch('');
                }
              }}
            />
            <div className="ws-search-results">
              {results.length ? (
                results.map((link) => (
                  <Link
                    to={link.path}
                    key={link.path}
                    onClick={() => {
                      setCommandOpen(false);
                      setSearch('');
                    }}
                  >
                    <span>{t('nav.' + link.key)}</span>
                    <span className="ws-muted">{t('nav.' + link.section)}</span>
                  </Link>
                ))
              ) : (
                <EmptyState title={t('shell.searchEmpty')} icon={<Search size={20} />} />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
