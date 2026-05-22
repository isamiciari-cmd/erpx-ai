import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error: Error;
  retry?: () => void;
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-gray-400 mb-6 max-w-md">{error.message}</p>
      {retry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={retry}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-white border border-gray-700"
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}
