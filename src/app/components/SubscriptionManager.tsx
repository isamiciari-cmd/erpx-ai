import { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, AlertCircle, CheckCircle, XCircle, Zap } from 'lucide-react';

interface SubscriptionManagerProps {
  tenantId: number;
  tenantName: string;
  currentPlan: string;
  status: string;
  onUpdate: () => void;
}

export default function SubscriptionManager({
  tenantId,
  tenantName,
  currentPlan,
  status,
  onUpdate,
}: SubscriptionManagerProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [processing, setProcessing] = useState(false);

  const plans = [
    { id: 'basic', name: 'Basic', price: 299 },
    { id: 'pro', name: 'Pro', price: 999 },
    { id: 'enterprise', name: 'Enterprise', price: 4500 },
  ];

  const handleUpgrade = async () => {
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('Stripe API Call:', {
      action: 'update_subscription',
      tenantId,
      tenantName,
      oldPlan: currentPlan,
      newPlan: selectedPlan,
    });

    alert(`✅ Subscription updated to ${selectedPlan}!`);
    setProcessing(false);
    setShowUpgrade(false);
    onUpdate();
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('Stripe API Call:', {
      action: 'cancel_subscription',
      tenantId,
      tenantName,
    });

    alert('❌ Subscription canceled!');
    setProcessing(false);
    onUpdate();
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertCircle className="w-3 h-3" />
            Past Due
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" />
            Canceled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Subscription</h3>
            <p className="text-sm text-gray-400">{tenantName}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Current Plan</span>
          <span className="text-white font-semibold">{currentPlan}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Monthly Cost</span>
          <span className="text-white font-semibold">
            SAR {plans.find((p) => p.name === currentPlan)?.price || 0}
          </span>
        </div>
      </div>

      {!showUpgrade ? (
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowUpgrade(true)}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-medium"
          >
            <Zap className="w-4 h-4 inline-block mr-2" />
            Change Plan
          </motion.button>
          {status === 'active' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCancel}
              disabled={processing}
              className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/20 disabled:opacity-50"
            >
              Cancel
            </motion.button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Select New Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.name}>
                  {plan.name} - SAR {plan.price}/mo
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpgrade}
              disabled={processing || selectedPlan === currentPlan}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Confirm Change'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUpgrade(false)}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm"
            >
              Cancel
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
