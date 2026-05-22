import { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, DollarSign, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const aiInsights = [
  {
    id: 1,
    type: 'prediction',
    title: 'Cash Flow Forecast',
    description: 'Based on current trends, you will have a cash surplus of $125,000 by end of Q2 2026',
    confidence: 92,
    icon: <DollarSign className="w-5 h-5" />,
    color: 'blue',
  },
  {
    id: 2,
    type: 'alert',
    title: 'Abnormal Expense Detected',
    description: 'Marketing expenses for April are 45% higher than average. Review campaign ROI.',
    confidence: 87,
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'yellow',
  },
  {
    id: 3,
    type: 'opportunity',
    title: 'Overdue Risk Analysis',
    description: '3 customers with history of late payments have invoices due soon. Total: $87,000',
    confidence: 78,
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'orange',
  },
  {
    id: 4,
    type: 'recommendation',
    title: 'Budget Adjustment Suggested',
    description: 'IT budget shows consistent underspending. Consider reallocating $15,000 to Marketing.',
    confidence: 85,
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'green',
  },
];

const cashFlowForecast = [
  { month: 'May', projected: 115000, lower: 98000, upper: 132000 },
  { month: 'Jun', projected: 142000, lower: 120000, upper: 165000 },
  { month: 'Jul', projected: 168000, lower: 145000, upper: 190000 },
  { month: 'Aug', projected: 195000, lower: 172000, upper: 218000 },
];

const aiFeatures = [
  { icon: '🔮', title: 'Cash Flow Prediction', description: 'AI-powered 6-month cash flow forecasting' },
  { icon: '🎯', title: 'Expense Anomaly Detection', description: 'Identify unusual spending patterns automatically' },
  { icon: '⚠️', title: 'Overdue Risk Scoring', description: 'Predict which invoices are at risk of late payment' },
  { icon: '💡', title: 'Budget Recommendations', description: 'Smart suggestions for budget optimization' },
  { icon: '📊', title: 'Revenue Forecasting', description: 'Predict future revenue based on trends' },
  { icon: '📈', title: 'Profitability Analysis', description: 'Deep dive into profit drivers and margins' },
  { icon: '🔍', title: 'Duplicate Detection', description: 'Find duplicate invoices and payments' },
  { icon: '📝', title: 'Auto Report Generation', description: 'Generate insights summaries automatically' },
];

export default function AIFinanceAssistantPage() {
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your AI Finance Assistant. I can help you with cash flow predictions, expense analysis, budget recommendations, and more. What would you like to know?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    setChatMessages([...chatMessages,
      { role: 'user', text: inputMessage },
      { role: 'assistant', text: 'I\'m analyzing your financial data... This is a demo response. In production, I would provide real AI-powered insights based on your query.' }
    ]);
    setInputMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1">AI Finance Assistant</h1>
          <p className="text-gray-600">Intelligent insights and predictions for smarter financial decisions</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiInsights.map((insight) => {
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600 border-blue-200',
            yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
            orange: 'bg-orange-100 text-orange-600 border-orange-200',
            green: 'bg-green-100 text-green-600 border-green-200',
          };

          return (
            <div key={insight.id} className={`border rounded-lg p-5 ${colorClasses[insight.color as keyof typeof colorClasses]}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white bg-opacity-50">
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
                  <p className="text-sm opacity-90">{insight.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Confidence: {insight.confidence}%</span>
                <button className="text-sm font-medium hover:underline">View Details →</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash Flow Forecast */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">AI Cash Flow Forecast (Next 4 Months)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cashFlowForecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Line type="monotone" dataKey="projected" stroke="#8b5cf6" strokeWidth={3} name="Projected" />
            <Line type="monotone" dataKey="lower" stroke="#cbd5e1" strokeDasharray="5 5" name="Lower Bound" />
            <Line type="monotone" dataKey="upper" stroke="#cbd5e1" strokeDasharray="5 5" name="Upper Bound" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Chat Interface */}
        <div className="bg-white rounded-lg shadow flex flex-col h-[500px]">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Ask AI Assistant</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about cash flow, expenses, budgets..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* AI Features */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">AI Capabilities</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3">
              {aiFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                  <div className="text-2xl">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
