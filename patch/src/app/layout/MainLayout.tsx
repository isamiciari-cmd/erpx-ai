import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Home, Package, Sparkles } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DevModeIndicator from '../components/DevModeIndicator';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="erpx-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <DevModeIndicator />
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`erpx-main ${collapsed ? 'erpx-main-collapsed' : ''}`}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="erpx-content">
          <div className="erpx-content-inner">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <nav className="erpx-mobile-bottom-nav" aria-label="Quick navigation">
          {[['Home','/dashboard',Home],['Sales','/sales',BarChart3],['Inventory','/inventory/manage',Package],['AI','/ai/recommendations',Sparkles]].map(([label,path,Icon]) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path as string));
            return <Link key={path as string} to={path as string} className={active ? 'is-active' : ''}><Icon size={18}/><span>{label as string}</span></Link>;
          })}
        </nav>
      </div>
    </div>
  );
}
