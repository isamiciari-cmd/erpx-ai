import { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Users, Send } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const aiInsights = [
  {
    id: 1,
    type: 'prediction',
    title: 'Turnover Risk Alert',
    description:
      '5 employees showing patterns similar to past resignations. Consider engagement initiatives.',
    confidence: 85,
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'red',
  },
  {
    id: 2,
    type: 'recommendation',
    title: 'Promotion Candidates',
    description: '3 employees consistently exceed KPIs and ready for advancement.',
    confidence: 92,
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'green',
  },
  {
    id: 3,
    type: 'analysis',
    title: 'Attendance Pattern',
    description: 'Monday and Friday show 22% higher late arrivals. Consider flexible hours.',
    confidence: 88,
    icon: <Users className="w-5 h-5" />,
    color: 'blue',
  },
  {
    id: 4,
    type: 'forecast',
    title: 'Hiring Needs Prediction',
    description: 'Sales team will need 4 additional members by Q3 based on growth trends.',
    confidence: 78,
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'purple',
  },
];

const turnoverForecast = [
  { month: 'May', projected: 2, historical: 1 },
  { month: 'Jun', projected: 3, historical: 2 },
  { month: 'Jul', projected: 2, historical: 2 },
  { month: 'Aug', projected: 4, historical: 3 },
];

const performanceDistribution = [
  { rating: 'Excellent', count: 28 },
  { rating: 'Good', count: 65 },
  { rating: 'Average', count: 32 },
  { rating: 'Needs Improvement', count: 10 },
];

const aiCapabilities = [
  {
    icon: '🔮',
    title: 'Turnover Prediction',
    description: 'Predict which employees are at risk of leaving',
  },
  {
    icon: '📊',
    title: 'Attendance Pattern Analysis',
    description: 'Identify trends and anomalies in attendance',
  },
  {
    icon: '🎯',
    title: 'Promotion Recommendations',
    description: 'Suggest high-performing employees for advancement',
  },
  {
    icon: '⚠️',
    title: 'Performance Issue Detection',
    description: 'Early identification of underperforming employees',
  },
  {
    icon: '📚',
    title: 'Training Program Suggestions',
    description: 'Recommend personalized training based on gaps',
  },
  {
    icon: '👥',
    title: 'Workforce Planning',
    description: 'Optimize headcount and team composition',
  },
  { icon: '🔍', title: 'Hiring Needs Forecast', description: 'Predict future hiring requirements' },
  {
    icon: '📝',
    title: 'Auto Report Generation',
    description: 'Generate HR insights automatically',
  },
];

export default function AIHRAssistantPage() {
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm your AI HR Assistant. I can help you with employee turnover predictions, performance analysis, workforce planning, and more. How can I assist you today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    setChatMessages([
      ...chatMessages,
      { role: 'user', text: inputMessage },
      {
        role: 'assistant',
        text: "I'm analyzing your HR data... This is a demo response. In production, I would provide real AI-powered insights based on your query.",
      },
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
          <h1 className="text-3xl font-bold mb-1">AI HR Assistant</h1>
          <p className="text-gray-600">Intelligent insights for smarter people management</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiInsights.map((insight) => {
          const colorClasses = {
            red: 'bg-red-100 text-red-600 border-red-200',
            green: 'bg-green-100 text-green-600 border-green-200',
            blue: 'bg-blue-100 text-blue-600 border-blue-200',
            purple: 'bg-purple-100 text-purple-600 border-purple-200',
          };

          return (
            <div
              key={insight.id}
              className={`border rounded-lg p-5 ${colorClasses[insight.color as keyof typeof colorClasses]}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white bg-opacity-50">{insight.icon}</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnover Forecast */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">AI Turnover Forecast (Next 4 Months)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={turnoverForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#8b5cf6"
                strokeWidth={3}
                name="Projected"
              />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#cbd5e1"
                strokeDasharray="5 5"
                name="Historical Avg"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Distribution Analysis</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Chat Interface */}
        <div className="bg-white rounded-lg shadow flex flex-col h-[500px]">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Ask AI HR Assistant</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
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
                placeholder="Ask about turnover, performance, hiring..."
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

        {/* AI Capabilities */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">AI Capabilities</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3">
              {aiCapabilities.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                >
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
