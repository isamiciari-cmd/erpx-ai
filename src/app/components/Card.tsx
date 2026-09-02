import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  color?: string;
  change?: string;
}

export default function Card({
  title,
  value,
  icon: Icon,
  color = 'from-blue-500 to-cyan-500',
  change,
}: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-[#111827] border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
    >
      {Icon && (
        <div
          className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center shadow-lg mb-4`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      )}
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-gray-400">{title}</p>
      {change && <p className="text-xs text-green-400 mt-2 font-medium">{change}</p>}
    </motion.div>
  );
}
