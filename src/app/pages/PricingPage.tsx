import { useState } from "react";
import { motion } from "motion/react";
import { Check, Zap, Building2, Rocket, Crown } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  stripePriceId: string;
  features: string[];
  recommended?: boolean;
  icon: any;
  color: string;
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 299,
    currency: "SAR",
    interval: "month",
    stripePriceId: "price_basic_monthly",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    features: [
      "Up to 10 users",
      "Finance & Invoicing",
      "Basic CRM",
      "10GB storage",
      "Email support",
      "Monthly reports",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 999,
    currency: "SAR",
    interval: "month",
    stripePriceId: "price_pro_monthly",
    icon: Rocket,
    color: "from-purple-500 to-pink-500",
    recommended: true,
    features: [
      "Up to 50 users",
      "All Basic features",
      "Advanced Analytics",
      "HR & Payroll",
      "Inventory Management",
      "100GB storage",
      "Priority support",
      "Custom workflows",
      "API access",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    currency: "SAR",
    interval: "custom",
    stripePriceId: "price_enterprise_custom",
    icon: Crown,
    color: "from-orange-500 to-yellow-500",
    features: [
      "Unlimited users",
      "All Pro features",
      "White-label solution",
      "Unlimited storage",
      "24/7 dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment",
      "Training & onboarding",
    ],
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [domain, setDomain] = useState("");

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    setShowCheckout(true);
  };

  const processSubscription = async () => {
    if (!companyName || !email || !selectedPlan) {
      alert("Please fill all required fields");
      return;
    }

    // Simulate Stripe customer creation
    const stripeCustomerId = `cus_${Math.random().toString(36).substring(7)}`;
    const stripeSubscriptionId = `sub_${Math.random().toString(36).substring(7)}`;

    console.log("Creating subscription:", {
      plan: plans.find((p) => p.id === selectedPlan),
      customer: { companyName, email, phone, domain },
      stripeCustomerId,
      stripeSubscriptionId,
    });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    alert(
      `🎉 Subscription successful!\n\nTenant: ${companyName}\nDomain: ${domain}.erpx.sa\nCustomer ID: ${stripeCustomerId}\n\nYou will receive an email with login credentials.`
    );

    setShowCheckout(false);
    setCompanyName("");
    setEmail("");
    setPhone("");
    setDomain("");
    setSelectedPlan(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold">EX</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ERPX</h1>
              <p className="text-xs text-gray-500">Business Suite</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl font-bold text-white mb-6">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Start your 14-day free trial. No credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-2">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-6 py-2 rounded-lg transition-all ${
                billingInterval === "month"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-6 py-2 rounded-lg transition-all ${
                billingInterval === "year"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-400">Save 20%</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -8 }}
              className={`relative bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border ${
                plan.recommended
                  ? "border-purple-500/50 shadow-2xl shadow-purple-500/20"
                  : "border-white/10"
              } rounded-2xl p-8 transition-all`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-semibold text-white">
                  MOST POPULAR
                </div>
              )}

              <div
                className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center shadow-lg mb-6`}
              >
                <plan.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>

              <div className="mb-6">
                {plan.price > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {billingInterval === "year"
                        ? Math.floor(plan.price * 0.8)
                        : plan.price}
                    </span>
                    <span className="text-gray-400">
                      {plan.currency}/{billingInterval === "year" ? "year" : "month"}
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-white">Custom Pricing</div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  plan.recommended
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
              >
                {plan.price > 0 ? "Start Free Trial" : "Contact Sales"}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && selectedPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowCheckout(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 rounded-2xl p-8 max-w-2xl w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Complete Your Subscription</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Selected Plan</p>
                  <p className="text-xl font-bold text-white">
                    {plans.find((p) => p.id === selectedPlan)?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Monthly Price</p>
                  <p className="text-2xl font-bold text-white">
                    {plans.find((p) => p.id === selectedPlan)?.price > 0
                      ? `${plans.find((p) => p.id === selectedPlan)?.price} SAR`
                      : "Custom"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 50 123 4567"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Subdomain</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="company"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">.erpx.sa</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your workspace URL: {domain || "company"}.erpx.sa
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={processSubscription}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium"
              >
                Complete Subscription
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCheckout(false)}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
              >
                Cancel
              </motion.button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-gray-400">
            Powerful features to run your business efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Building2,
              title: "Multi-Tenant Architecture",
              desc: "Isolated workspaces with custom domains",
            },
            {
              icon: Zap,
              title: "Real-time Updates",
              desc: "Live data synchronization across all devices",
            },
            {
              icon: Check,
              title: "ZATCA Compliant",
              desc: "Saudi e-invoicing ready",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
