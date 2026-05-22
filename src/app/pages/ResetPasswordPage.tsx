import { useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { updatePassword } from "../../services/authService";
import { useNavigate } from "react-router";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword({ newPassword });

      if (result.error) {
        setError(result.error.message || "Failed to update password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Password Updated</h2>
            <p className="text-gray-400 mb-6">
              Your password has been successfully updated. Redirecting to login...
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
            >
              Sign In Now
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Set New Password</h2>
            <p className="text-gray-500">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div>
              <label htmlFor="newPassword" className="block text-sm text-gray-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-gray-400 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Updating..." : "Update Password"}
              </span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
