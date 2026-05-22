import { useState } from "react";
import { motion } from "motion/react";
import { Webhook, CheckCircle, XCircle, Clock, Zap } from "lucide-react";

interface WebhookEvent {
  id: string;
  type: string;
  status: "pending" | "success" | "failed";
  timestamp: string;
  payload: any;
  response?: string;
}

export default function WebhookSimulatorPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [selectedEventType, setSelectedEventType] = useState("invoice.paid");

  const eventTypes = [
    { value: "invoice.paid", label: "Invoice Paid" },
    { value: "invoice.payment_failed", label: "Payment Failed" },
    { value: "customer.subscription.created", label: "Subscription Created" },
    { value: "customer.subscription.updated", label: "Subscription Updated" },
    { value: "customer.subscription.deleted", label: "Subscription Canceled" },
    { value: "customer.subscription.trial_will_end", label: "Trial Ending" },
  ];

  const simulateWebhook = async () => {
    const eventId = `evt_${Math.random().toString(36).substring(7)}`;
    const newEvent: WebhookEvent = {
      id: eventId,
      type: selectedEventType,
      status: "pending",
      timestamp: new Date().toISOString(),
      payload: {
        id: eventId,
        object: "event",
        type: selectedEventType,
        data: {
          object: {
            id: `sub_${Math.random().toString(36).substring(7)}`,
            customer: `cus_${Math.random().toString(36).substring(7)}`,
            status: "active",
            plan: { id: "price_pro", amount: 99900, currency: "sar" },
          },
        },
      },
    };

    setEvents([newEvent, ...events]);

    // Simulate webhook processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const updatedEvent: WebhookEvent = {
      ...newEvent,
      status: "success",
      response: handleWebhookEvent(selectedEventType),
    };

    setEvents([updatedEvent, ...events.slice(1)]);
  };

  const handleWebhookEvent = (eventType: string): string => {
    switch (eventType) {
      case "invoice.paid":
        return "✅ Subscription activated. Tenant status updated to 'active'.";
      case "invoice.payment_failed":
        return "⚠️ Payment failed. Tenant status updated to 'past_due'. Email notification sent.";
      case "customer.subscription.created":
        return "🎉 New subscription created. Tenant workspace provisioned.";
      case "customer.subscription.updated":
        return "🔄 Subscription updated. Plan changes applied.";
      case "customer.subscription.deleted":
        return "❌ Subscription canceled. Tenant access suspended.";
      case "customer.subscription.trial_will_end":
        return "⏰ Trial ending reminder sent to customer.";
      default:
        return "Event processed.";
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-8"
      >
        Webhook Simulator
      </motion.h1>

      {/* Simulator Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Webhook className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Stripe Webhook Tester</h2>
            <p className="text-sm text-gray-400">
              Simulate Stripe webhook events and see how the system responds
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={simulateWebhook}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Send Webhook Event
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearEvents}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
          >
            Clear History
          </motion.button>
        </div>
      </motion.div>

      {/* Events List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Webhook Events</h2>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center">
            <Webhook className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No webhook events yet. Send one to get started.</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 bg-white/5 border border-white/10 rounded-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {event.status === "pending" && (
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                      </div>
                    )}
                    {event.status === "success" && (
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                    )}
                    {event.status === "failed" && (
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold">{event.type}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.status === "success"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : event.status === "failed"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>

                {event.response && (
                  <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5">
                    <p className="text-sm text-gray-300">{event.response}</p>
                  </div>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                    View Payload
                  </summary>
                  <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-gray-400 overflow-x-auto">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </details>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
