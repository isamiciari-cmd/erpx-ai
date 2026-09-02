import { motion } from 'motion/react';

interface GenericPageProps {
  title: string;
  description?: string;
}

export default function GenericPage({ title, description }: GenericPageProps) {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        {description && <p className="text-gray-400 mb-8">{description}</p>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
          <span className="text-4xl">🚀</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">{title} Module</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          This module is under development. Stay tuned for exciting features coming soon!
        </p>
      </motion.div>
    </div>
  );
}
