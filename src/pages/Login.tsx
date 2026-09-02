import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isDemoMode, hasSupabaseConfig } from '../lib/supabase';

export default function Login() {
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div>{t('auth.authenticating')}</div>;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginForm />;
}

function LoginForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    if (isDemoMode && !hasSupabaseConfig) {
      localStorage.setItem('erpx_demo_email', email.trim());
      localStorage.setItem('erpx_demo_password', password);
      window.location.href = '/dashboard';
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('[Login] Sign in failed:', error);
        setError(error.message || 'Invalid email or password.');
        return;
      }

      if (!data.user) {
        setError('Authentication succeeded but no user was returned.');
        return;
      }

      localStorage.setItem('erpx_demo_email', data.user.email || email.trim());
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('[Login] Unexpected login error:', err);
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Login Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 shadow-2xl relative">
          {/* Language Switcher */}
          <div className="absolute top-4 right-4">
            <LanguageSwitcher variant="compact" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <LogIn className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              ERPX-AI
            </h1>
            <p className="text-gray-400">{t('auth.enterCredentials')}</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="admin@erpxai.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800/50 text-blue-500 focus:ring-blue-500/50"
                />
                <span className="text-sm text-gray-400">{t('auth.rememberMe')}</span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {t('auth.forgotPassword')}
              </a>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{t('auth.signIn')}</span>
            </motion.button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <p className="text-xs text-gray-400 mb-2 text-center font-semibold">
              {t('auth.demoCredentials')}
            </p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>{t('users.admin')}: admin@erpxai.com / admin123</p>
              <p>{t('users.manager')}: manager@erpxai.com / manager123</p>
              <p>{t('users.employee')}: employee@erpxai.com / employee123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          &copy; 2026 ERPX-AI. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
