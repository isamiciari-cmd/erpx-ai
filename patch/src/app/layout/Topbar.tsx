import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bell, Command, LogOut, Menu, Moon, Search, Sparkles, Sun, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../context/ThemeContext';

const commands = [
  ['Sales', '/sales'], ['Inventory', '/inventory/manage'], ['Purchases', '/purchase'],
  ['Finance', '/finance'], ['HR', '/hr'], ['Reports', '/reports'],
  ['AI Recommendations', '/ai/recommendations'], ['AI Alerts', '/ai/alerts'],
] as const;

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [q, setQ] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [palette, setPalette] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette(true);
      }
      if (event.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (palette) setTimeout(() => searchRef.current?.focus(), 20);
  }, [palette]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const match = commands.find(([label]) => label.toLowerCase().includes(q.trim().toLowerCase()));
    nav(match?.[1] ?? '/dashboard');
    setPalette(false);
  };

  const logout = async () => {
    await signOut();
    nav('/login', { replace: true });
  };

  const displayName = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Workspace user';
  const initials = (user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <>
      <header className="erpx-topbar">
        <button className="erpx-mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
        <form onSubmit={submit} className="erpx-global-search" onClick={() => setPalette(true)}>
          <Search size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or ask ERPX-AI…" aria-label="Global search" />
          <span className="erpx-shortcut"><Command size={11} /> K</span>
        </form>
        <div className="erpx-topbar-actions">
          <button className="erpx-icon-button erpx-ai-button" onClick={() => nav('/ai/recommendations')} title="AI Command Center"><Sparkles size={17} /></button>
          <button className="erpx-icon-button hidden sm:grid" onClick={toggleTheme} title="Toggle theme">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
          <div className="relative">
            <button className="erpx-icon-button" onClick={() => setNotifications((v) => !v)} title="Notifications">
              <Bell size={17} /><span className="erpx-notification-dot" />
            </button>
            {notifications && (
              <div className="erpx-popover right-0 w-[min(360px,calc(100vw-32px))]">
                <div className="flex items-center justify-between border-b border-[var(--app-border)] px-3 pb-3"><b>Notifications</b><button onClick={() => setNotifications(false)}><X size={15} /></button></div>
                {['Low stock: USB-C Cable', '3 leave requests pending', 'New sales order SO-10021'].map((item, i) => (
                  <button key={item} onClick={() => { setNotifications(false); nav(i === 0 ? '/inventory/manage' : i === 1 ? '/hr/leaves' : '/sales'); }} className="block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-[var(--app-hover)]">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--brand)]" />{item}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="erpx-user-chip hidden md:flex">
            <div className="erpx-avatar">{initials}</div>
            <div className="min-w-0"><div className="truncate text-xs font-bold">{displayName}</div><div className="truncate text-[10px] text-[var(--app-muted)]">{user?.role?.display_name || 'Workspace user'}</div></div>
          </div>
          <button onClick={logout} className="erpx-icon-button hidden sm:grid" title="Logout"><LogOut size={16} /></button>
        </div>
      </header>

      {palette && (
        <div className="erpx-command-overlay" onMouseDown={() => setPalette(false)}>
          <div className="erpx-command" onMouseDown={(e) => e.stopPropagation()}>
            <form onSubmit={submit} className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3">
              <Search size={18} className="text-[var(--app-muted)]" />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages, modules, workflows…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              <button type="button" onClick={() => setPalette(false)}><X size={16} /></button>
            </form>
            <div className="p-2">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[var(--app-muted-2)]">Quick navigation</div>
              {commands.map(([label, path]) => (
                <button key={path} onClick={() => { nav(path); setPalette(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm hover:bg-[var(--app-hover)]">
                  <span>{label}</span><span className="text-xs text-[var(--app-muted-2)]">Open</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
