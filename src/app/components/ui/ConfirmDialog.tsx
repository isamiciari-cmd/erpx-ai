import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const icons = {
    danger: Trash2,
    warning: AlertTriangle,
    info: CheckCircle,
  };

  const colors = {
    danger: {
      bg: 'from-red-500 to-rose-500',
      button: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      bg: 'from-yellow-500 to-orange-500',
      button: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      bg: 'from-blue-500 to-cyan-500',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const Icon = icons[type];
  const color = colors[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
            >
              {/* Icon */}
              <div className="p-6 text-center">
                <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>

                {/* Message */}
                <p className="text-gray-400 leading-relaxed">{message}</p>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-white/10 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-6 py-3 ${color.button} text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
