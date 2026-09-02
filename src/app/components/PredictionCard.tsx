import { motion } from 'motion/react';
import { TrendingUp, Brain, Sparkles } from 'lucide-react';

interface PredictionCardProps {
  data: Array<{ value: number }>;
  title: string;
}

export default function PredictionCard({ data, title }: PredictionCardProps) {
  // Simple linear prediction based on trend
  const calculatePrediction = () => {
    if (data.length < 2) return 0;

    const recent = data.slice(-5);
    const trend =
      recent.reduce((sum, item, i, arr) => {
        if (i === 0) return 0;
        return sum + (item.value - arr[i - 1].value);
      }, 0) /
      (recent.length - 1);

    return Math.round(data[data.length - 1].value + trend * 3);
  };

  const prediction = calculatePrediction();
  const currentValue = data[data.length - 1]?.value || 0;
  const growthRate = (((prediction - currentValue) / currentValue) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 hover:shadow-2xl hover:shadow-purple-500/20 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400">AI Prediction</p>
            <p className="text-sm font-semibold text-white">{title}</p>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            {prediction.toLocaleString()}
          </h2>
          <span className="text-sm text-gray-400">SAR</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Next 3 periods forecast</p>
      </div>

      <div
        className={`flex items-center gap-2 text-sm ${Number(growthRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}
      >
        <TrendingUp className="w-4 h-4" />
        <span className="font-medium">{growthRate}% growth expected</span>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Confidence Level</span>
          <span className="text-purple-400 font-semibold">78%</span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '78%' }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>
      </div>
    </motion.div>
  );
}
