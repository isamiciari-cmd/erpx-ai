import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity, BarChart3, Bell, Brain, ChevronDown, ChevronLeft, ChevronRight,
  DollarSign, FileText, LayoutDashboard, Package, Settings, Shield,
  ShoppingBag, ShoppingCart, Sparkles, UserCog, Users, Wrench, X,
} from 'lucide-react';

const sections = [
  { name: 'Workspace', items: [['Overview', '/dashboard', LayoutDashboard], ['Reports', '/reports', FileText]] },
  { name: 'Business', items: [['Sales', '/sales', ShoppingCart], ['Purchases', '/purchase', ShoppingBag], ['Inventory', '/inventory', Package], ['Finance', '/finance', DollarSign], ['HR', '/hr', Users]] },
  { name: 'Intelligence', items: [['AI Predictions', '/ai/predictions', Brain], ['AI Recommendations', '/ai/recommendations', BarChart3], ['AI Alerts', '/ai/alerts', Bell]] },
  { name: 'Administration', items: [['Users', '/system/users', UserCog], ['Roles & Permissions', '/system/permissions', Shield], ['System Diagnostic', '/admin/supabase-diagnostic', Wrench], ['Settings', '/settings', Settings]] },
] as const;

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
};

export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: Props) {
  const location = useLocation();
  const [open, setOpen] = useState<string[]>(['Workspace', 'Business', 'Intelligence']);

  const content = (
    <aside className="erpx-sidebar">
      <div className="erpx-brand">
        <div className="erpx-brand-mark"><Sparkles size={18} /></div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="erpx-brand-name">ERPX-AI</div>
            <div className="erpx-brand-subtitle">Intelligent Enterprise OS</div>
          </div>
        )}
        <button className="erpx-mobile-close" onClick={onMobileClose} aria-label="Close navigation"><X size={18} /></button>
      </div>

      <nav className="erpx-nav" aria-label="Main navigation">
        {sections.map((section) => {
          const expanded = open.includes(section.name);
          return (
            <div className="erpx-nav-section" key={section.name}>
              {!collapsed && (
                <button
                  className="erpx-nav-section-label"
                  onClick={() => setOpen((items) => expanded ? items.filter((x) => x !== section.name) : [...items, section.name])}
                >
                  <span>{section.name}</span>
                  <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
              )}
              <AnimatePresence initial={false}>
                {(collapsed || expanded) && section.items.map(([label, path, Icon]) => {
                  const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
                  return (
                    <Link key={path} to={path} title={collapsed ? label : undefined} onClick={onMobileClose}>
                      <motion.div
                        whileHover={{ x: collapsed ? 0 : 2 }}
                        transition={{ duration: 0.12 }}
                        className={`erpx-nav-item ${active ? 'is-active' : ''}`}
                      >
                        <Icon size={18} className="shrink-0" />
                        {!collapsed && <span>{label}</span>}
                        {!collapsed && active && <span className="erpx-nav-active-dot" />}
                      </motion.div>
                    </Link>
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="erpx-sidebar-footer">
        {collapsed ? (
          <span className="erpx-live-dot" title="System operational" />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-[var(--app-muted)]">ERPX-AI V2</div>
              <div className="text-[10px] text-[var(--app-muted-2)]">Enterprise Edition</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><Activity size={12} /> Live</div>
          </div>
        )}
      </div>

      <button className="erpx-sidebar-toggle" onClick={onToggle} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </aside>
  );

  return (
    <>
      <div className="erpx-desktop-sidebar" data-collapsed={collapsed}>{content}</div>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              className="erpx-mobile-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onMobileClose} aria-label="Close navigation"
            />
            <motion.div
              className="erpx-mobile-sidebar"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
