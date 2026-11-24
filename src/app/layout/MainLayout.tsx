import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AIAssistant from '../components/AIAssistant';
import DevModeIndicator from '../components/DevModeIndicator';
import { workspaceRoute } from './workspaceNavigation';

export default function MainLayout() {
  const { t, i18n } = useTranslation('workspace');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('erpx-sidebar-collapsed') === 'true',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const route = workspaceRoute(pathname);
  const rtl = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const Separator = rtl ? ChevronLeft : ChevronRight;
  useEffect(() => {
    localStorage.setItem('erpx-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const close = () => {
      if (media.matches) setMobileOpen(false);
    };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  return (
    <div className="erpx-shell" dir={rtl ? 'rtl' : 'ltr'}>
      <a className="ws-skip" href="#workspace-content">
        {t('shell.skip')}
      </a>
      <DevModeIndicator />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`erpx-main ${sidebarCollapsed ? 'erpx-main-collapsed' : ''}`}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="erpx-content" id="workspace-content" tabIndex={-1}>
          <div className="erpx-content-inner">
            <nav className="ws-breadcrumbs" aria-label={t('shell.breadcrumbs')}>
              <Link to="/dashboard" aria-label={t('shell.home')}>
                <Home size={13} />
              </Link>
              {route && (
                <>
                  <Separator size={11} aria-hidden="true" />
                  <span>{t('nav.' + route.section)}</span>
                  <Separator size={11} aria-hidden="true" />
                  <span aria-current="page">{t('nav.' + route.key)}</span>
                </>
              )}
            </nav>
            <Outlet />
          </div>
        </main>
      </div>
      <AIAssistant />
    </div>
  );
}
