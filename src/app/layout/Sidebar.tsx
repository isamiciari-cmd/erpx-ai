import { useState } from "react";
import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  DollarSign,
  Users,
  Brain,
  TrendingUp,
  Bell,
  UserCog,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Wind,
  Lock,
  Wifi,
  Wrench,
  FileText,
  Building2,
} from "lucide-react";

const menu = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, category: null },

  // Core Modules
  { name: "Inventory", path: "/inventory", icon: Package, category: "Core Modules" },
  { name: "Sales", path: "/sales", icon: ShoppingCart, category: "Core Modules" },
  { name: "Purchases", path: "/purchase", icon: ShoppingBag, category: "Core Modules" },
  { name: "Finance", path: "/finance/accounting", icon: DollarSign, category: "Core Modules" },
  { name: "HR", path: "/hr/employees", icon: Users, category: "Core Modules" },

  // AI Center
  { name: "Predictions", path: "/ai/predictions", icon: Brain, category: "AI Center" },
  { name: "Recommendations", path: "/ai/recommendations", icon: TrendingUp, category: "AI Center" },
  { name: "Alerts", path: "/ai/alerts", icon: Bell, category: "AI Center" },

  // System
  { name: "Reports", path: "/reports", icon: FileText, category: "System" },
  { name: "Users", path: "/system/users", icon: UserCog, category: "System" },
  { name: "Roles & Permissions", path: "/system/permissions", icon: Shield, category: "System" },
  { name: "Supabase Diagnostic", path: "/admin/supabase-diagnostic", icon: Wrench, category: "System" },
  { name: "Settings", path: "/settings", icon: Settings, category: "System" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "Core Modules",
    "AI Center",
  ]);

  const categories = Array.from(new Set(menu.filter(m => m.category).map(m => m.category))) as string[];

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-gray-900/50 backdrop-blur-xl border-r border-gray-800/50 flex flex-col relative"
    >
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        onClick={onToggle}
        className="absolute -right-4 top-10 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl flex items-center justify-center text-white transition-all shadow-xl shadow-blue-500/30 z-50"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </motion.button>

      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ERPX-AI
              </h1>
              <p className="text-xs text-gray-500 font-medium">Smart ERP</p>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <Sparkles size={20} className="text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {/* Dashboard */}
        {menu
          .filter(item => !item.category)
          .map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 4, scale: collapsed ? 1.05 : 1 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer mb-2 transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10"
                      : "hover:bg-gray-800/50 text-gray-300 hover:text-white border border-transparent"
                  }`}
                  title={collapsed ? item.name : ""}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-semibold whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}

        {/* Categories */}
        {categories.map(category => (
          <div key={category} className="mt-4">
            {!collapsed && (
              <motion.button
                whileHover={{ x: 2 }}
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-all text-left flex items-center justify-between mb-2"
              >
                <span>{category}</span>
                <motion.div
                  animate={{ rotate: expandedCategories.includes(category) ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={14} />
                </motion.div>
              </motion.button>
            )}
            <AnimatePresence>
              {(collapsed || expandedCategories.includes(category)) &&
                menu
                  .filter(item => item.category === category)
                  .map((item, index) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <Link key={item.path} to={item.path}>
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ x: collapsed ? 0 : 4, scale: collapsed ? 1.05 : 1 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer mb-2 transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10"
                              : "hover:bg-gray-800/50 text-gray-400 hover:text-white border border-transparent"
                          }`}
                          title={collapsed ? item.name : ""}
                        >
                          <Icon size={18} className="flex-shrink-0" />
                          <AnimatePresence>
                            {!collapsed && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="text-sm font-medium whitespace-nowrap"
                              >
                                {item.name}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </Link>
                    );
                  })}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-gray-800/50 bg-gray-800/20">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-gray-400">ERPX-AI v1.0</p>
                <p className="text-xs text-gray-500 mt-0.5">Enterprise Edition</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                <span className="text-xs text-green-400 font-semibold">Live</span>
              </div>
            </motion.div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
