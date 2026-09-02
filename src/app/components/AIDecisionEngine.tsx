import { motion } from 'motion/react';
import { Lightbulb, TrendingUp, AlertCircle, Target } from 'lucide-react';

interface AIDecisionEngineProps {
  data: Array<{ value: number }>;
}

export default function AIDecisionEngine({ data }: AIDecisionEngineProps) {
  const analyzeAndDecide = () => {
    if (data.length === 0)
      return { type: 'neutral', decision: 'Gathering data...', icon: AlertCircle };

    const latest = data[data.length - 1].value;
    const average = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const trend = latest - data[0].value;

    if (latest < 200) {
      return {
        type: 'warning',
        decision: '⚠️ Recommend increasing marketing budget by 25%',
        reason: 'Current performance is below optimal threshold',
        action: 'Launch targeted campaigns in underperforming segments',
        icon: AlertCircle,
        color: 'from-yellow-500 to-orange-500',
      };
    }

    if (latest > 800) {
      return {
        type: 'success',
        decision: '🔥 Scale operations now!',
        reason: 'High demand detected - capitalize on momentum',
        action: 'Increase inventory and expand team capacity by 30%',
        icon: TrendingUp,
        color: 'from-green-500 to-emerald-500',
      };
    }

    if (trend > 0 && latest > average) {
      return {
        type: 'positive',
        decision: '✅ Maintain current strategy',
        reason: 'Stable growth trajectory detected',
        action: 'Continue current operations while monitoring key metrics',
        icon: Target,
        color: 'from-blue-500 to-cyan-500',
      };
    }

    return {
      type: 'neutral',
      decision: '💡 Optimize for efficiency',
      reason: 'Performance is stable but has room for improvement',
      action: 'Focus on conversion rate optimization and customer retention',
      icon: Lightbulb,
      color: 'from-purple-500 to-pink-500',
    };
  };

  const result = analyzeAndDecide();
  const Icon = result.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all"
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`w-12 h-12 bg-gradient-to-br ${result.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-400">AI Decision Engine</h3>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full font-semibold">
              LIVE
            </span>
          </div>
          <p className="text-lg font-bold text-white">{result.decision}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Analysis</p>
          <p className="text-sm text-white">{result.reason}</p>
        </div>

        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Recommended Action</p>
          <p className="text-sm text-white">{result.action}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Decision Confidence</span>
          <span
            className={`text-transparent bg-clip-text bg-gradient-to-r ${result.color} font-bold`}
          >
            92%
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '92%' }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full bg-gradient-to-r ${result.color}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
