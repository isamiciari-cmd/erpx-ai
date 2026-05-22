import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Zap, CheckCircle, XCircle, Play, Pause } from "lucide-react";
import automationEngine from "../services/AutomationEngine";

export default function AutomationRulesPage() {
  const [rules, setRules] = useState(automationEngine.getRules());
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const toggleRule = (ruleId: string) => {
    automationEngine.toggleRule(ruleId);
    setRules([...automationEngine.getRules()]);
    addLog(`Rule "${ruleId}" toggled`);
  };

  const runSimulation = async () => {
    addLog("Starting automation simulation...");

    const mockTenantData = [
      {
        id: 1,
        name: "Acme Corp",
        status: "active",
        plan: "Pro",
        paymentFailed: 3,
        usage: 0.6,
        revenue: 0.1,
      },
      {
        id: 2,
        name: "TechStart Ltd",
        status: "active",
        plan: "Basic",
        paymentFailed: 0,
        usage: 0.85,
        revenue: 0.15,
      },
      {
        id: 3,
        name: "SmallBiz Co",
        status: "active",
        plan: "Pro",
        paymentFailed: 0,
        usage: 0.15,
        revenue: -0.25,
      },
    ];

    await automationEngine.executeRules(mockTenantData);
    addLog("Automation simulation completed. Check console for detailed logs.");
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-8"
      >
        Automation Rules
      </motion.h1>

      {/* Run Simulation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Test Automation Engine</h2>
              <p className="text-sm text-gray-400">
                Run a simulation with mock tenant data to test all rules
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runSimulation}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run Simulation
          </motion.button>
        </div>
      </motion.div>

      {/* Rules List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">Active Rules</h2>

          <div className="space-y-4">
            {rules.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-xl border ${
                  rule.enabled
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-gray-500/10 border-gray-500/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    {rule.enabled ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div>
                      <h3 className="text-white font-semibold">{rule.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">ID: {rule.id}</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleRule(rule.id)}
                    className={`p-2 rounded-lg ${
                      rule.enabled
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {rule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Execution Log */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">Execution Log</h2>

          {executionLog.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No executions yet. Run a simulation to see logs.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {executionLog.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-black/30 rounded-lg border border-white/5"
                >
                  <p className="text-xs text-gray-300 font-mono">{log}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Rule Documentation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold text-white mb-6">How Automation Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-white font-semibold mb-2">Auto-suspend unpaid tenant</h3>
            <p className="text-sm text-gray-400 mb-2">
              <strong>Condition:</strong> Payment failed ≥ 3 times AND status = active
            </p>
            <p className="text-sm text-gray-400">
              <strong>Action:</strong> Suspend tenant + Notify admin
            </p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-white font-semibold mb-2">Suggest plan upgrade</h3>
            <p className="text-sm text-gray-400 mb-2">
              <strong>Condition:</strong> Usage &gt; 80% AND plan = Basic
            </p>
            <p className="text-sm text-gray-400">
              <strong>Action:</strong> Send upgrade email to Pro plan
            </p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-white font-semibold mb-2">Detect churn risk</h3>
            <p className="text-sm text-gray-400 mb-2">
              <strong>Condition:</strong> Usage &lt; 20% AND status = active
            </p>
            <p className="text-sm text-gray-400">
              <strong>Action:</strong> Send engagement email + Notify admin
            </p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-white font-semibold mb-2">Alert on revenue drop</h3>
            <p className="text-sm text-gray-400 mb-2">
              <strong>Condition:</strong> Revenue drop ≥ 20%
            </p>
            <p className="text-sm text-gray-400">
              <strong>Action:</strong> Notify admin immediately
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
