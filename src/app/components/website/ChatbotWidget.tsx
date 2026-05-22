import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hello! I\'m the ERPX-AI Assistant. How can I help you today? 👋\n\nمرحباً! أنا مساعد ERPX-AI. كيف يمكنني مساعدتك اليوم؟',
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  const quickQuestions = [
    'What is ERPX-AI?',
    'Pricing information',
    'Request a demo',
    'AI Features',
    'Finance module',
    'HR module',
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const response = getAIResponse(input);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    }, 1000);

    setInput('');
  };

  const getAIResponse = (question: string): string => {
    const q = question.toLowerCase();

    if (q.includes('price') || q.includes('pricing') || q.includes('cost')) {
      return 'We offer three pricing tiers:\n\n• Starter: Perfect for small businesses (1-10 users)\n• Business: For growing companies (up to 50 users)\n• Enterprise: Unlimited users with advanced features\n\nContact our sales team for a custom quote tailored to your needs!';
    }

    if (q.includes('demo')) {
      return 'I\'d be happy to help you schedule a demo! \n\nPlease visit our demo request page or provide:\n• Your name\n• Email\n• Company name\n• Phone number\n\nOur team will contact you within 24 hours to schedule a personalized demo session.';
    }

    if (q.includes('ai') || q.includes('artificial intelligence')) {
      return 'ERPX-AI includes powerful AI features:\n\n🎯 Sales Forecasting\n💰 Cash Flow Prediction\n📦 Inventory Demand Forecasting\n⚠️ Expense Anomaly Detection\n📊 Automated Report Generation\n💡 Smart Business Recommendations\n\nOur AI learns from your data to provide actionable insights!';
    }

    if (q.includes('finance') || q.includes('accounting')) {
      return 'Our Finance & Accounting module includes:\n\n• Chart of Accounts\n• General Ledger\n• Accounts Receivable/Payable\n• Cash & Bank Management\n• Financial Statements\n• Budget Management\n• VAT & ZATCA-ready\n• Multi-currency support';
    }

    if (q.includes('hr') || q.includes('human resources') || q.includes('payroll')) {
      return 'Our HR module covers:\n\n👥 Employee Management\n⏰ Attendance Tracking\n🏖️ Leave Management\n💵 Payroll Processing\n📝 Contracts\n🎯 Performance Reviews\n📚 Training Programs\n🔐 Employee Self-Service';
    }

    if (q.includes('inventory') || q.includes('stock') || q.includes('warehouse')) {
      return 'Inventory Management features:\n\n📦 Real-time Stock Tracking\n🏢 Multi-warehouse Support\n🔄 Stock Transfers\n📊 Batch/Serial Tracking\n⚠️ Reorder Alerts\n🤖 AI Demand Forecasting\n📈 Inventory Reports';
    }

    if (q.includes('contact') || q.includes('email') || q.includes('phone')) {
      return 'You can reach us at:\n\n📧 Email: i.sami.ciari@erpx-ai.com\n🌐 Website: Contact form available\n💬 Chat: Right here!\n⏰ Support: 24/7 for Business & Enterprise\n\nHow else can I help you?';
    }

    return 'Thank you for your question! ERPX-AI is a comprehensive ERP platform with modules for Finance, HR, Inventory, Sales, Purchases, POS, and AI automation.\n\nWould you like to:\n• Schedule a demo\n• Learn about pricing\n• Speak with our sales team\n• Explore specific modules\n\nI can also connect you with a human agent if needed!';
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-blue-500/50 transition-shadow"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-gray-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">ERPX-AI Assistant</h3>
                  <p className="text-xs text-blue-100">Online • Powered by AI</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                  className="px-2 py-1 bg-white/20 rounded text-xs text-white hover:bg-white/30 transition-colors"
                >
                  {language === 'en' ? 'AR' : 'EN'}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-300 border border-white/10'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.slice(0, 3).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-gray-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={language === 'en' ? 'Type your message...' : 'اكتب رسالتك...'}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleSend}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                Powered by ERPX-AI • Email: i.sami.ciari@erpx-ai.com
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
