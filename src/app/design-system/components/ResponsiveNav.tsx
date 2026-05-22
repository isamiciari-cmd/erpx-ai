import { useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Home, Package, ShoppingCart, Users, Settings, TrendingUp } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: ReactNode;
}

interface ResponsiveNavProps {
  logo?: ReactNode;
  items: NavItem[];
  collapsed?: boolean;
  onToggle?: () => void;
}

// Desktop Sidebar
export function DesktopSidebar({ logo, items, collapsed = false, onToggle }: ResponsiveNavProps) {
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? '80px' : '280px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col bg-black border-r border-gray-800 h-screen sticky top-0"
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        {!collapsed && logo}
        {collapsed && (
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center mx-auto">
            <span className="text-black font-bold text-xl">E</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 4 }}
                  className={`
                    flex items-center gap-3 p-4 rounded-xl
                    transition-all duration-200
                    ${isActive
                      ? 'bg-yellow-400 text-black'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-semibold whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        className="m-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
      >
        <Menu className="w-6 h-6 text-white" />
      </motion.button>
    </motion.aside>
  );
}

// Tablet Sidebar (Collapsed)
export function TabletSidebar({ logo, items }: ResponsiveNavProps) {
  const location = useLocation();

  return (
    <aside className="hidden md:flex lg:hidden flex-col bg-black border-r border-gray-800 h-screen w-20 sticky top-0">
      {/* Logo */}
      <div className="flex items-center justify-center p-4 border-b border-gray-800">
        <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
          <span className="text-black font-bold text-xl">E</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`
                    flex items-center justify-center p-3 rounded-xl
                    transition-all duration-200
                    ${isActive
                      ? 'bg-yellow-400 text-black'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                  title={item.name}
                >
                  {item.icon}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

// Mobile Bottom Navigation
export function MobileBottomNav({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const mainItems = items.slice(0, 4); // Show only 4 main items

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-4 gap-1 p-2">
        {mainItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-xl
                  transition-all duration-200
                  ${isActive ? 'bg-yellow-400 text-black' : 'text-gray-400'}
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-semibold truncate w-full text-center">
                  {item.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Mobile Hamburger Menu
export function MobileHamburgerMenu({ logo, items }: ResponsiveNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="md:hidden">
      {/* Header */}
      <header className="sticky top-0 bg-black border-b border-gray-800 px-4 py-3 flex items-center justify-between z-40">
        {logo}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl bg-gray-800 text-white"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </header>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Menu */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-black border-r border-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-800">
                {logo}
              </div>

              <nav className="p-4">
                <div className="space-y-2">
                  {items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                      >
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className={`
                            flex items-center gap-3 p-4 rounded-xl
                            transition-all duration-200
                            ${isActive
                              ? 'bg-yellow-400 text-black'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }
                          `}
                        >
                          <span className="flex-shrink-0">{item.icon}</span>
                          <span className="font-semibold">{item.name}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Combined Responsive Navigation
export function ResponsiveNavigation({ logo, items }: Omit<ResponsiveNavProps, 'collapsed' | 'onToggle'>) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      {/* Desktop */}
      <DesktopSidebar
        logo={logo}
        items={items}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Tablet */}
      <TabletSidebar logo={logo} items={items} />

      {/* Mobile */}
      <MobileHamburgerMenu logo={logo} items={items} />
      <MobileBottomNav items={items} />
    </>
  );
}

// Default Nav Items for Food Delivery
export const defaultFoodDeliveryNav: NavItem[] = [
  { name: 'Home', path: '/', icon: <Home size={20} /> },
  { name: 'Orders', path: '/orders', icon: <ShoppingCart size={20} /> },
  { name: 'Menu', path: '/menu', icon: <Package size={20} /> },
  { name: 'Analytics', path: '/analytics', icon: <TrendingUp size={20} /> },
  { name: 'Customers', path: '/customers', icon: <Users size={20} /> },
  { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
];
