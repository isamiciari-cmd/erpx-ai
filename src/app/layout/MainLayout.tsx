import AIAssistant from '../components/AIAssistant';
﻿import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DevModeIndicator from '../components/DevModeIndicator';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="erpx-shell min-h-screen text-[var(--app-text)]">
      <DevModeIndicator />
      <AIAssistant />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={`erpx-main ${
          sidebarCollapsed ? 'erpx-main-collapsed' : ''
        }`}
      >
        <Topbar onMenu={() => setMobileOpen(true)} />

        <main className="erpx-content">
          <div className="erpx-content-inner">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{
                  duration: 0.18,
                  ease: 'easeOut',
                }}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <nav className="erpx-mobile-bottom-nav" aria-label="Quick navigation">
          <a
            href="/dashboard"
            className={
              location.pathname === '/dashboard' ? 'is-active' : ''
            }
          >
            <span>⌂</span>
            <span>Home</span>
          </a>

          <a
            href="/sales"
            className={
              location.pathname.startsWith('/sales') ? 'is-active' : ''
            }
          >
            <span>↗</span>
            <span>Sales</span>
          </a>

          <a
            href="/inventory"
            className={
              location.pathname.startsWith('/inventory') ? 'is-active' : ''
            }
          >
            <span>▦</span>
            <span>Inventory</span>
          </a>

          <a
            href="/ai/recommendations"
            className={
              location.pathname.startsWith('/ai/')
                ? 'is-active'
                : ''
            }
          >
            <span>✦</span>
            <span>AI</span>
          </a>
        </nav>
      </div>
    </div>
  );
}
