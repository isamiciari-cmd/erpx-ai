import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { BarChart3, TrendingUp, Users, DollarSign, AlertCircle, Globe, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { supabase, isDemoMode, hasSupabaseConfig } from "../../lib/supabase";

interface ProductionLoginProps {
  onLoginSuccess?: () => void;
}

export default function ProductionLogin({ onLoginSuccess }: ProductionLoginProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    if (isDemoMode && !hasSupabaseConfig) {
      const demoEmail = email.trim() || "admin@erpx-ai.com";
      const demoPassword = password.trim() || "@12345";

      localStorage.setItem("erpx_demo_email", demoEmail);
      localStorage.setItem("erpx_demo_password", demoPassword);
      console.log("[Login] Demo mode fallback active. Redirecting to /dashboard");
      window.location.href = "/dashboard";
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("[Login] Sign in failed:", error);
        setError(error.message || "Invalid email or password.");
        return;
      }

      if (!data.user) {
        setError("Authentication succeeded but no user was returned.");
        return;
      }

      localStorage.setItem("erpx_demo_email", data.user.email || email.trim());
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("[Login] Unexpected sign-in error:", err);
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      if (!email) {
        alert(t('auth.enterEmailFirst'));
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert(t('auth.passwordResetSent'));
    } catch (err) {
      console.error('Forgot password error:', err);
      alert('Failed to send reset password email');
    }
  };

  return (
    <div className="h-screen flex bg-black">
      {/* Left side - Illustration */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 items-center justify-center relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl font-bold text-white mb-4"
          >
            {t('welcome.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-gray-400 mb-12"
          >
            {t('welcome.subtitle')}
          </motion.p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, label: t('welcome.analytics') },
              { icon: TrendingUp, label: t('welcome.growth') },
              { icon: Users, label: t('welcome.team') },
              { icon: DollarSign, label: t('welcome.revenue') },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
              >
                <feature.icon className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-sm text-gray-300">{feature.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </motion.div>

      {/* Right side - Login form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-gray-950 relative"
      >
        {/* Language Switcher and Website Button - Top Right */}
        <div className="absolute top-8 right-8 flex items-center gap-3">
          <LanguageSwitcher variant="compact" />
          <Link to="/">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all group cursor-pointer"
            >
              <Globe className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-sm font-semibold">{t('auth.visitWebsite')}</span>
            </motion.div>
          </Link>
        </div>

        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-2">{t('auth.signIn')}</h2>
            <p className="text-gray-500">{t('auth.enterCredentials')}</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-2 focus:ring-blue-500 text-blue-500"
                />
                <span className="text-sm text-gray-400">{t('auth.rememberMe')}</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              type="submit"
              disabled={isSubmitting}
              className="relative w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? "Signing in..." : t('auth.signIn')}
              </span>
              <div className="absolute inset-0 shadow-[0_0_20px_rgba(59,130,246,0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>

            
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8 space-y-4"
          >
            {/* Register New Company Button */}
            <a
              href="/register"
              className="block w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold transition-all text-center"
            >
              {t('auth.registerNewCompany')}
            </a>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <p className="text-xs text-gray-500">OR</p>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
