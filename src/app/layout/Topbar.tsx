import { listInvoices } from '../../services/invoicesService';
﻿import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  Command,
  Globe,
  LogOut,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Props = {
  onMenu: () => void;
};

const commands = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Sales', path: '/sales' },
  { label: 'Inventory', path: '/inventory' },
  { label: 'Purchases', path: '/purchase' },
  { label: 'Finance', path: '/finance/accounting' },
  { label: 'HR', path: '/hr/employees' },
  { label: 'Reports', path: '/reports' },
  { label: 'AI Recommendations', path: '/ai/recommendations' },
  { label: 'AI Alerts', path: '/ai/alerts' },
];

export default function Topbar({ onMenu }: Props) {
  const [showNotifications, setShowNotifications] =
    useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [search, setSearch] = useState('');

  const commandRef = useRef<HTMLInputElement>(null);

  const { i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === 'Escape') {
        setCommandOpen(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyboard);

    return () =>
      window.removeEventListener('keydown', handleKeyboard);
  }, []);

  useEffect(() => {
    if (commandOpen) {
      window.setTimeout(() => {
        commandRef.current?.focus();
      }, 50);
    }
  }, [commandOpen]);

  const filteredCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();

    const value = search.trim();

    if (!value) {
      setCommandOpen(true);
      return;
    }

    const match = commands.find((command) =>
      command.label.toLowerCase().includes(value.toLowerCase()),
    );

    if (match) {
      navigate(match.path);
      setSearch('');
      setCommandOpen(false);
    } else {
      setCommandOpen(true);
    }
  };

  const [notifications, setNotifications] = useState<{id:string;text:string;time:string}[]>([]);
  const [notificationError, setNotificationError] = useState('');
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setNotifications([]); setNotificationError('');
    if (!showNotifications || !user?.company_id) { setNotificationsLoading(false); return; }
    setNotificationsLoading(true);
    void listInvoices(user.company_id).then(invoices => {
      if (!active) return;
      const today = new Date().toISOString().slice(0,10);
      setNotifications(invoices.filter(invoice => !['draft','cancelled','void','refunded'].includes(invoice.status.toLowerCase()) && Number(invoice.total_amount) > Number(invoice.amount_paid) && invoice.due_date < today)
        .sort((a,b) => a.due_date.localeCompare(b.due_date)).slice(0,10)
        .map(invoice => ({ id:invoice.id,text:`Overdue invoice ${invoice.invoice_number}`,time:`Due ${invoice.due_date}` })));
    }).catch(error => { if (active) setNotificationError(error instanceof Error ? error.message : 'Notifications unavailable.'); })
      .finally(() => { if (active) setNotificationsLoading(false); });
    return () => { active = false; };
  }, [showNotifications, user?.company_id]);

  const firstName =
    user?.first_name ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.email || 'User';

  const role =
    user?.role?.display_name ||
    user?.role?.name ||
    'User';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[color:var(--app-surface)]/90 backdrop-blur-xl">
        <div className="flex min-h-[72px] items-center gap-3 px-3 sm:px-5 lg:px-7">
          <button
            type="button"
            onClick={onMenu}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)] transition hover:text-[var(--app-text)] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>

          <form
            onSubmit={handleSearch}
            className="min-w-0 flex-1"
          >
            <div className="relative max-w-3xl">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)]"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onFocus={() => setCommandOpen(true)}
                placeholder="Search ERPX-AI..."
                className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] pl-11 pr-24 text-sm font-medium text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent-soft)]"
              />

              <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-[10px] font-bold text-[var(--app-muted)] sm:flex">
                <Command size={11} />
                K
              </div>
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                i18n.changeLanguage(
                  i18n.language === 'ar' ? 'en' : 'ar',
                )
              }
              className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 text-[var(--app-muted)] transition hover:text-[var(--app-text)] sm:flex"
              title="Change language"
            >
              <Globe size={16} />
              <span className="text-xs font-bold">
                {i18n.language === 'ar' ? 'EN' : 'AR'}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              title={
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
            >
              {theme === 'dark' ? (
                <Sun size={17} />
              ) : (
                <Moon size={17} />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event('erpx:open-ai'))
              }
              className="hidden h-10 w-10 place-items-center rounded-xl bg-[var(--app-accent)] text-slate-900 shadow-lg shadow-yellow-500/10 transition hover:scale-105 sm:grid"
              title="AI Assistant"
            >
              <Sparkles size={17} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowNotifications((value) => !value)
                }
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                aria-label="Notifications"
              >
                <Bell size={17} />

                {notifications.length > 0 && (
                  <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -8,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                      scale: 0.98,
                    }}
                    className="absolute right-0 mt-3 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-4">
                      <div>
                        <div className="text-sm font-bold text-[var(--app-text)]">
                          Notifications
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--app-muted)]">
                          Overdue invoice reminders
                        </div>
                      </div>

                      <span className="rounded-full bg-[var(--app-accent-soft)] px-2 py-1 text-[10px] font-bold text-[var(--app-text)]">
                        {notifications.length} new
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading && <p role="status" className="p-4">Loading?</p>}
                      {notificationError && <p role="alert" className="p-4">{notificationError}</p>}
                      {!notificationsLoading && !notificationError && !notifications.length && <p className="p-4">No overdue invoices.</p>}
                      {notifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => { setShowNotifications(false); navigate('/finance/accounts-receivable'); }}
                          className="flex w-full gap-3 border-b border-[var(--app-border)] px-4 py-4 text-left transition hover:bg-[var(--app-surface-2)]"
                        >
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--app-accent)]" />

                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[var(--app-text)]">
                              {notification.text}
                            </span>

                            <span className="mt-1 block text-[11px] text-[var(--app-muted)]">
                              {notification.time}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => { setShowNotifications(false); navigate('/finance/accounts-receivable'); }}
                      className="w-full px-4 py-3 text-center text-xs font-bold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                    >
                      View all receivables
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden h-8 w-px bg-[var(--app-border)] md:block" />

            <div className="hidden items-center gap-3 md:flex">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--app-accent)] font-extrabold text-slate-900">
                {firstName.charAt(0).toUpperCase()}
              </div>

              <div className="max-w-[150px]">
                <div className="truncate text-xs font-bold text-[var(--app-text)]">
                  {displayName}
                </div>
                <div className="truncate text-[10px] font-medium text-[var(--app-muted)]">
                  {role}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {commandOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommandOpen(false)}
              aria-label="Close command palette"
            />

            <motion.div
              initial={{
                opacity: 0,
                y: -16,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -16,
                scale: 0.98,
              }}
              className="fixed left-1/2 top-[12vh] z-[90] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-4">
                <Search
                  size={18}
                  className="text-[var(--app-muted)]"
                />

                <input
                  ref={commandRef}
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search pages, modules and actions..."
                  className="h-14 min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted-2)]"
                />

                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCommandOpen(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-2)]"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto p-2">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((command) => (
                    <button
                      type="button"
                      key={command.path}
                      onClick={() => {
                        navigate(command.path);
                        setSearch('');
                        setCommandOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-[var(--app-surface-2)]"
                    >
                      <span className="text-sm font-semibold text-[var(--app-text)]">
                        {command.label}
                      </span>

                      <span className="text-[10px] font-medium text-[var(--app-muted)]">
                        {command.path}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-[var(--app-muted)]">
                    No matching page found.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
