import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, TrendingDown, AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  value?: number;
}

interface SmartAlertsProps {
  data: Array<{ value: number }>;
}

export default function SmartAlerts({ data }: SmartAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const generateAlerts = (): Alert[] => {
    const alerts: Alert[] = [];

    if (data.length < 2) return alerts;

    const latest = data[data.length - 1].value;
    const previous = data[data.length - 2].value;
    const average = data.reduce((sum, d) => sum + d.value, 0) / data.length;

    // Check for significant drops
    if (latest < previous * 0.8) {
      alerts.push({
        id: 'drop',
        type: 'warning',
        message: 'Significant drop detected in recent activity',
        value: ((previous - latest) / previous) * 100,
      });
    }

    // Check for below average
    if (latest < average * 0.7) {
      alerts.push({
        id: 'below-avg',
        type: 'error',
        message: 'Performance below average threshold',
        value: latest,
      });
    }

    // Check for unusual spikes
    if (latest > previous * 1.5) {
      alerts.push({
        id: 'spike',
        type: 'info',
        message: 'Unusual spike in activity detected',
        value: ((latest - previous) / previous) * 100,
      });
    }

    return alerts.filter((alert) => !dismissedAlerts.includes(alert.id));
  };

  const alerts = generateAlerts();

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return 'from-yellow-900/40 to-orange-900/40 border-yellow-500/30 text-yellow-400';
      case 'error':
        return 'from-red-900/40 to-rose-900/40 border-red-500/30 text-red-400';
      case 'info':
        return 'from-blue-900/40 to-cyan-900/40 border-blue-500/30 text-blue-400';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'error':
        return TrendingDown;
      case 'info':
        return AlertCircle;
    }
  };

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-xl border border-green-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-400">All Systems Normal</p>
            <p className="text-xs text-gray-400">No alerts at this time</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {alerts.map((alert, i) => {
          const Icon = getAlertIcon(alert.type);
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${getAlertStyles(alert.type)} backdrop-blur-xl border rounded-2xl p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-1">{alert.message}</p>
                    {alert.value !== undefined && (
                      <p className="text-xs text-gray-400">
                        Value: {alert.value.toFixed(1)}
                        {alert.type === 'spike' || alert.type === 'drop' ? '%' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
