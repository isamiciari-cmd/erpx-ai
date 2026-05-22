import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="relative w-16 h-8 bg-gray-800/50 dark:bg-gray-700/50 border border-gray-700/50 dark:border-gray-600/50 rounded-full transition-all duration-300 flex items-center px-1"
      aria-label="Toggle theme"
    >
      {/* Sliding Circle */}
      <motion.div
        animate={{
          x: theme === 'dark' ? 0 : 32,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="absolute w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 dark:from-yellow-400 dark:to-orange-500 rounded-full shadow-lg flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: theme === 'dark' ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-white" />
          ) : (
            <Sun className="w-4 h-4 text-white" />
          )}
        </motion.div>
      </motion.div>

      {/* Background Icons */}
      <div className="flex items-center justify-between w-full px-1">
        <Moon className={`w-4 h-4 transition-opacity duration-300 ${theme === 'dark' ? 'opacity-0' : 'opacity-40 text-gray-400'}`} />
        <Sun className={`w-4 h-4 transition-opacity duration-300 ${theme === 'light' ? 'opacity-0' : 'opacity-40 text-gray-400'}`} />
      </div>
    </motion.button>
  );
}
