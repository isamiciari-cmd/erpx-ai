import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDown, ChevronsLeft, ChevronsRight, Layers2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  navigationSections,
  workspaceAdminRoles,
  workspaceRoute,
  type WorkspaceLink,
} from './workspaceNavigation';

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
};
export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: Props) {
  const { t, i18n } = useTranslation('workspace');
  const { roles } = useAuth();
  const { pathname } = useLocation();
  const rtl = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const admin = roles.some((role) => workspaceAdminRoles.includes(role.role_name));
  const [open, setOpen] = useState<string[]>([
    'workspace',
    'business',
    'intelligence',
    'administration',
  ]);
  const [submenus, setSubmenus] = useState<string[]>([]);
  const route = workspaceRoute(pathname);
  useEffect(() => {
    const parent = navigationSections
      .flatMap((section) => section.items)
      .find((item) => item.children?.some((child) => child.path === pathname));
    if (parent)
      setSubmenus((current) => (current.includes(parent.key) ? current : [...current, parent.key]));
    if (route)
      setOpen((current) =>
        current.includes(route.section) ? current : [...current, route.section],
      );
  }, [pathname, route?.section]);
  const toggle = (key: string) =>
    setOpen((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  function content(mobile: boolean) {
    const compact = collapsed && !mobile;
    const link = (item: WorkspaceLink, nested = false) => {
      const Icon = item.icon;
      const active = route?.path === item.path || pathname === item.path;
      const childOpen = submenus.includes(item.key);
      const label = t('nav.' + item.key);
      const element = (
        <Link
          to={item.path}
          onClick={onMobileClose}
          className={`erpx-nav-item ${active ? 'is-active' : ''}`}
          aria-current={active ? 'page' : undefined}
          aria-label={compact ? label : undefined}
        >
          <Icon size={17} aria-hidden="true" />
          {!compact && <span>{label}</span>}
          {active && !compact && <span className="erpx-nav-active-dot" />}
        </Link>
      );
      return (
        <div key={item.path} className={nested ? 'erpx-nav-child' : undefined}>
          <div className="erpx-nav-link-row">
            {compact ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>{element}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="ws-tooltip"
                    side={rtl ? 'left' : 'right'}
                    sideOffset={12}
                  >
                    {label}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              element
            )}
            {item.children && !compact && (
              <button
                className="erpx-nav-expand"
                onClick={() =>
                  setSubmenus((current) =>
                    current.includes(item.key)
                      ? current.filter((value) => value !== item.key)
                      : [...current, item.key],
                  )
                }
                aria-label={label}
                aria-expanded={childOpen}
              >
                <ChevronDown size={13} className={childOpen ? 'rotate-180' : ''} />
              </button>
            )}
          </div>
          {item.children && !compact && childOpen && (
            <div className="erpx-nav-children">
              {item.children.map((child) => link(child, true))}
            </div>
          )}
        </div>
      );
    };
    return (
      <aside className="erpx-sidebar">
        <div className="erpx-brand">
          <Link
            to="/dashboard"
            onClick={onMobileClose}
            aria-label="ERPX-AI"
            className="erpx-brand-mark"
          >
            <Layers2 size={20} />
          </Link>
          {!compact && (
            <div className="min-w-0">
              <div className="erpx-brand-name" dir="ltr">
                ERPX-AI
              </div>
              <div className="erpx-brand-subtitle">{t('shell.tagline')}</div>
            </div>
          )}
          {mobile && (
            <button
              className="erpx-nav-close"
              onClick={onMobileClose}
              aria-label={t('shell.closeNavigation')}
            >
              <X size={19} />
            </button>
          )}
        </div>
        <nav className="erpx-nav" aria-label={t('shell.mainNavigation')}>
          {navigationSections.map((section) => {
            const items = section.items.filter((item) => !item.admin || admin);
            if (!items.length) return null;
            return (
              <div key={section.key} className="erpx-nav-section">
                {!compact && (
                  <button
                    className="erpx-nav-section-label"
                    onClick={() => toggle(section.key)}
                    aria-expanded={open.includes(section.key)}
                  >
                    <span>{t('nav.' + section.key)}</span>
                    <ChevronDown
                      size={12}
                      className={open.includes(section.key) ? '' : '-rotate-90'}
                    />
                  </button>
                )}
                {(compact || open.includes(section.key)) && items.map((item) => link(item))}
              </div>
            );
          })}
        </nav>
        {!mobile && (
          <div className="erpx-sidebar-footer">
            <button
              className="erpx-sidebar-toggle"
              onClick={onToggle}
              aria-label={t(collapsed ? 'shell.expand' : 'shell.collapse')}
            >
              {collapsed !== rtl ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
              {!compact && t('shell.collapse')}
            </button>
          </div>
        )}
      </aside>
    );
  }
  return (
    <Tooltip.Provider delayDuration={250}>
      <div className="erpx-desktop-sidebar" data-collapsed={collapsed}>
        {content(false)}
      </div>
      <Dialog.Root
        open={mobileOpen}
        onOpenChange={(value) => {
          if (!value) onMobileClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="ws-overlay" />
          <Dialog.Content
            className="ws-drawer erpx-mobile-navigation"
            dir={rtl ? 'rtl' : 'ltr'}
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">{t('shell.mainNavigation')}</Dialog.Title>
            {content(true)}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Tooltip.Provider>
  );
}
