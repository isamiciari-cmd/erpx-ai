import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface Currency {
  code: string;
  name: string;
  rate: number;
  change: number;
}

// Mock API - in production, connect to exchangerate-api.com
const currencyAPI = {
  currencies: [
    { code: 'SAR', name: 'Saudi Riyal', rate: 1, change: 0 },
    { code: 'USD', name: 'US Dollar', rate: 0.27, change: 0.5 },
    { code: 'EUR', name: 'Euro', rate: 0.25, change: -0.3 },
    { code: 'GBP', name: 'British Pound', rate: 0.21, change: 0.2 },
    { code: 'AED', name: 'UAE Dirham', rate: 0.98, change: 0.1 },
    { code: 'KWD', name: 'Kuwaiti Dinar', rate: 0.08, change: -0.1 },
  ] as Currency[],

  async fetchRates(): Promise<Currency[]> {
    // Simulate API call with random fluctuations
    const updated = this.currencies.map((c) => ({
      ...c,
      rate: c.rate * (1 + (Math.random() - 0.5) * 0.01),
      change: (Math.random() - 0.5) * 2,
    }));
    return new Promise((resolve) => setTimeout(() => resolve(updated), 500));
  },

  convert(amount: number, fromRate: number, toRate: number): number {
    return (amount / fromRate) * toRate;
  },
};

export default function CurrencyPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Converter state
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('SAR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [result, setResult] = useState(0);

  const fetchRates = async () => {
    setLoading(true);
    const rates = await currencyAPI.fetchRates();
    setCurrencies(rates);
    setLastUpdate(new Date());
    setLoading(false);
    calculateConversion(rates);
  };

  const calculateConversion = (rates = currencies) => {
    const fromRate = rates.find((c) => c.code === fromCurrency)?.rate || 1;
    const toRate = rates.find((c) => c.code === toCurrency)?.rate || 1;
    const converted = currencyAPI.convert(Number(amount), fromRate, toRate);
    setResult(converted);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    calculateConversion();
  }, [amount, fromCurrency, toCurrency, currencies]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Multi-Currency System
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchRates}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Rates
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Currency Converter */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Currency Converter
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">From</label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">To</label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6 mt-6">
              <p className="text-sm text-gray-400 mb-2">Converted Amount</p>
              <p className="text-4xl font-bold text-white">
                {result.toFixed(2)} {toCurrency}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                1 {fromCurrency} ={' '}
                {(
                  (currencies.find((c) => c.code === toCurrency)?.rate || 1) /
                  (currencies.find((c) => c.code === fromCurrency)?.rate || 1)
                ).toFixed(4)}{' '}
                {toCurrency}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Live Rates Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-2">Exchange Rates</h2>
          <p className="text-sm text-gray-500 mb-6">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>

          <div className="space-y-3">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{currency.code[0]}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{currency.code}</p>
                    <p className="text-xs text-gray-400">{currency.name}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-white font-semibold">{currency.rate.toFixed(4)}</p>
                  <div
                    className={`flex items-center gap-1 text-xs ${
                      currency.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {currency.change >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(currency.change).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Integration Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-white mb-3">🔄 Auto-Update Integration</h3>
        <p className="text-gray-300 mb-4">
          Connect to live exchange rate APIs for real-time currency data:
        </p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            ExchangeRate-API.com - Free tier available
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-500 rounded-full" />
            Automatic daily updates via Cron Jobs
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Historical data and trend analysis
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
