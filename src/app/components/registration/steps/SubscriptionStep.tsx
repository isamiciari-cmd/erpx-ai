import { motion } from 'motion/react';
import { UseFormReturn } from 'react-hook-form';
import { Check } from 'lucide-react';
import type { Subscription } from '../../../../lib/validation/registrationSchema';

interface SubscriptionStepProps {
  form: UseFormReturn<Subscription>;
}

const modules = [
  {
    key: 'finance' as const,
    label: 'Finance & Accounting',
    description: 'Manage financial transactions and reports',
  },
  { key: 'hr' as const, label: 'Human Resources', description: 'Employee management and payroll' },
  {
    key: 'inventory' as const,
    label: 'Inventory Management',
    description: 'Track stock and warehouses',
  },
  { key: 'pos' as const, label: 'Point of Sale', description: 'Retail and sales operations' },
  {
    key: 'reports' as const,
    label: 'Advanced Reports',
    description: 'Business intelligence and analytics',
  },
  {
    key: 'aiAssistant' as const,
    label: 'AI Assistant',
    description: 'Smart automation and insights',
  },
];

export default function SubscriptionStep({ form }: SubscriptionStepProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const selectedPlan = watch('plan');
  const selectedModules = watch('modules');

  const toggleModule = (key: keyof typeof selectedModules) => {
    setValue(`modules.${key}`, !selectedModules?.[key]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Plan Selection */}
      <div>
        <label className="block text-sm text-gray-400 mb-4">
          Select Plan <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label
            className={`relative cursor-pointer p-6 border-2 rounded-xl transition-all ${
              selectedPlan === 'trial'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-white/5 hover:border-gray-600'
            }`}
          >
            <input type="radio" {...register('plan')} value="trial" className="sr-only" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-1">Trial</h3>
              <p className="text-2xl font-bold text-blue-400 mb-2">FREE</p>
              <p className="text-xs text-gray-400">30 days</p>
            </div>
            {selectedPlan === 'trial' && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </label>

          <label
            className={`relative cursor-pointer p-6 border-2 rounded-xl transition-all ${
              selectedPlan === 'monthly'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-white/5 hover:border-gray-600'
            }`}
          >
            <input type="radio" {...register('plan')} value="monthly" className="sr-only" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-1">Monthly</h3>
              <p className="text-2xl font-bold text-green-400 mb-2">$99</p>
              <p className="text-xs text-gray-400">per month</p>
            </div>
            {selectedPlan === 'monthly' && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </label>

          <label
            className={`relative cursor-pointer p-6 border-2 rounded-xl transition-all ${
              selectedPlan === 'yearly'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-white/5 hover:border-gray-600'
            }`}
          >
            <input type="radio" {...register('plan')} value="yearly" className="sr-only" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-1">Yearly</h3>
              <p className="text-2xl font-bold text-purple-400 mb-2">$999</p>
              <p className="text-xs text-gray-400">per year (save 16%)</p>
            </div>
            {selectedPlan === 'yearly' && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </label>
        </div>
        {errors.plan && <p className="text-red-400 text-sm mt-2">{errors.plan.message}</p>}
      </div>

      {/* Number of Branches & Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Number of Branches <span className="text-red-400">*</span>
          </label>
          <input
            {...register('numberOfBranches', { valueAsNumber: true })}
            type="number"
            min="1"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1"
          />
          {errors.numberOfBranches && (
            <p className="text-red-400 text-sm mt-1">{errors.numberOfBranches.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Number of Users <span className="text-red-400">*</span>
          </label>
          <input
            {...register('numberOfUsers', { valueAsNumber: true })}
            type="number"
            min="1"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="5"
          />
          {errors.numberOfUsers && (
            <p className="text-red-400 text-sm mt-1">{errors.numberOfUsers.message}</p>
          )}
        </div>
      </div>

      {/* Modules */}
      <div>
        <label className="block text-sm text-gray-400 mb-4">
          Required Modules <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((module) => (
            <label
              key={module.key}
              className={`cursor-pointer p-4 border rounded-lg transition-all ${
                selectedModules?.[module.key]
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-white/5 hover:border-gray-600'
              }`}
              onClick={() => toggleModule(module.key)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    selectedModules?.[module.key]
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-600'
                  }`}
                >
                  {selectedModules?.[module.key] && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-sm">{module.label}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{module.description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.modules && <p className="text-red-400 text-sm mt-2">{errors.modules.message}</p>}
      </div>
    </motion.div>
  );
}
