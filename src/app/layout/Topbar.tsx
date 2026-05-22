import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Search, LogOut, Globe, Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router";

export default function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [language, setLanguage] = useState("EN");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const notifications = [
    { id: 1, text: "Low stock alert: Product A", type: "warning", time: "2m ago" },
    { id: 2, text: "New order #1234 received", type: "success", time: "5m ago" },
    { id: 3, text: "AI prediction ready", type: "info", time: "10m ago" },
  ];

  return (
    <div className="bg-gray-900/80 backdrop-blur-2xl border-b border-gray-800/50 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
      {/* AI Smart Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
          <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-pulse" />
          <input
            type="text"
            placeholder="Ask AI anything... Try: 'Show energy usage trends' or 'Generate financial report'"
            className="w-full pl-12 pr-12 py-3.5 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm hover:bg-gray-800/70 font-medium"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 ml-8">
        {/* Language Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLanguage(language === "EN" ? "AR" : "EN")}
          className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-800/50 rounded-xl transition-all text-gray-300 hover:text-white border border-gray-700/50 hover:border-gray-600/50"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-semibold">{language}</span>
        </motion.button>

        {/* AI Assistant Shortcut */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          title="AI Assistant"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </motion.button>

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 hover:bg-gray-800/50 rounded-xl transition-all border border-gray-700/50 hover:border-gray-600/50"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-red-500/30"
            >
              {notifications.length}
            </motion.span>
          </motion.button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="absolute right-0 mt-3 w-96 bg-gray-900/95 backdrop-blur-2xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-gray-800/50 bg-gradient-to-r from-gray-800/30 to-gray-900/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">Notifications</h3>
                    <span className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full font-semibold">
                      {notifications.length} new
                    </span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      whileHover={{ backgroundColor: "rgba(31, 41, 55, 0.5)" }}
                      className="p-5 border-b border-gray-800/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            notif.type === "warning"
                              ? "bg-yellow-500/20"
                              : notif.type === "success"
                              ? "bg-green-500/20"
                              : "bg-blue-500/20"
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              notif.type === "warning"
                                ? "bg-yellow-400"
                                : notif.type === "success"
                                ? "bg-green-400"
                                : "bg-blue-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium mb-1">{notif.text}</p>
                          <p className="text-xs text-gray-500 font-medium">{notif.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-4 bg-gray-800/30 border-t border-gray-800/50">
                  <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    View All Notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-4 pl-4 ml-4 border-l border-gray-700/50">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-base">
                {user?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-gray-900 rounded-full" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-white">
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.email || "User"}
            </p>
            <p className="text-xs text-gray-400 font-medium">
              {user?.role?.display_name || user?.role?.name || "User"}
            </p>
          </div>
        </div>

        {/* Logout */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="p-3 hover:bg-red-500/10 rounded-xl transition-all text-gray-400 hover:text-red-400 border border-gray-700/50 hover:border-red-500/30"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
