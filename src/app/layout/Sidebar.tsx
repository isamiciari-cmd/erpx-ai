import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UserCog,
  Users,
  Wrench,
  X,
} from 'lucide-react';

const sections = [
  {
    name: 'Workspace',
    items: [
      ['Dashboard', '/dashboard', LayoutDashboard],
      ['Reports', '/reports', FileText],
    ],
  },
  {
    name: 'Business',
    items: [
      ['Sales', '/sales', ShoppingCart],
      ['Purchases', '/purchase', ShoppingBag],
      ['Inventory', '/inventory', Package],
      ['Finance', '/finance/accounting', DollarSign],
      ['HR', '/hr/employees', Users],
    ],
  },
  {
    name: 'Intelligence',
    items: [
      ['AI Predictions', '/ai/predictions', Brain],
      ['AI Recommendations', '/ai/recommendations', BarChart3],
      ['AI Alerts', '/ai/alerts', Bell],
    ],
  },
  {
    name: 'Administration',
    items: [
      ['Users', '/system/users', UserCog],
      ['Roles & Permissions', '/system/permissions', Shield],
      ['System Diagnostic', '/admin/supabase-diagnostic', Wrench],
      ['Settings', '/settings', Settings],
    ],
  },
] as const;

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
};

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
}: Props) {
  const location = useLocation();

  const [openSections, setOpenSections] = useState<string[]>([
    'Workspace',
    'Business',
    'Intelligence',
    'Administration',
  ]);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/dashboard' &&
      location.pathname.startsWith(path + '/'));

  const toggleSection = (name: string) => {
    setOpenSections((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  const content = (
    <aside className="erpx-sidebar">
      <div className="erpx-brand">
        <div className="erpx-brand-mark">
          <Sparkles size={18} />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <div className="erpx-brand-name">ERPX-AI</div>
            <div className="erpx-brand-subtitle">
              Intelligent Enterprise OS
            </div>
          </div>
        )}

        <button
          type="button"
          className="erpx-mobile-close"
          onClick={onMobileClose}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="erpx-nav" aria-label="Main navigation">
        {sections.map((section) => {
          const expanded = openSections.includes(section.name);

          return (
            <div className="erpx-nav-section" key={section.name}>
              {!collapsed && (
                <button
                  type="button"
                  className="erpx-nav-section-label"
                  onClick={() => toggleSection(section.name)}
                  aria-expanded={expanded}
                >
                  <span>{section.name}</span>
                  <ChevronDown
                    size={14}
                    className={
                      expanded
                        ? 'rotate-180 transition-transform'
                        : 'transition-transform'
                    }
                  />
                </button>
              )}

              <AnimatePresence initial={false}>
                {(collapsed || expanded) &&
                  section.items.map(([label, path, Icon]) => {
                    const active = isActive(path);

                    return (
                      <Link
                        key={path}
                        to={path}
                        title={collapsed ? label : undefined}
                        onClick={onMobileClose}
                      >
                        <motion.div
                          whileHover={{ x: collapsed ? 0 : 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.12 }}
                          className={`erpx-nav-item ${
                            active ? 'is-active' : ''
                          }`}
                        >
                          <Icon size={18} className="shrink-0" />

                          {!collapsed && <span>{label}</span>}

                          {!collapsed && active && (
                            <span className="erpx-nav-active-dot" />
                          )}
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
          <span
            className="erpx-live-dot"
            title="System operational"
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-[var(--app-muted)]">
                ERPX-AI V2
              </div>
              <div className="text-[10px] text-[var(--app-muted-2)]">
                Enterprise Edition
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <Activity size={12} />
              Live
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="erpx-sidebar-toggle"
        onClick={onToggle}
        aria-label={
          collapsed ? 'Expand navigation' : 'Collapse navigation'
        }
      >
        {collapsed ? (
          <ChevronRight size={15} />
        ) : (
          <ChevronLeft size={15} />
        )}
      </button>
    </aside>
  );

  return (
    <>
      <div
        className="erpx-desktop-sidebar"
        data-collapsed={collapsed}
      >
        {content}
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              className="erpx-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              aria-label="Close navigation"
            />

            <motion.div
              className="erpx-mobile-sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{
                duration: 0.2,
                ease: 'easeOut',
              }}
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
