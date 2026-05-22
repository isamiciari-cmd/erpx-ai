import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function RegistrationSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, companyName } = location.state || {};

  useEffect(() => {
    // If no state data, redirect to login
    if (!email || !companyName) {
      navigate("/login");
    }
  }, [email, companyName, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-gray-900/80 backdrop-blur-xl border border-green-500/50 rounded-2xl p-12 text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <CheckCircle className="w-16 h-16 text-green-400" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-white mb-4"
        >
          Registration Successful!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-gray-300 mb-8"
        >
          Welcome to ERPX-AI, <span className="text-blue-400 font-semibold">{companyName}</span>
        </motion.p>

        {/* Email Verification Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-white mb-2">
                Verify Your Email
              </h3>
              <p className="text-sm text-gray-300 mb-3">
                We've sent a verification email to:
              </p>
              <p className="text-blue-400 font-mono text-sm bg-blue-500/10 px-3 py-2 rounded">
                {email}
              </p>
              <p className="text-sm text-gray-400 mt-3">
                Please click the verification link in the email to activate your
                account. If you don't see it, check your spam folder.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left"
        >
          <h3 className="font-semibold text-white mb-4">Next Steps:</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Verify your email address</p>
                <p className="text-sm text-gray-400">
                  Click the link in the verification email we sent you
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Log in to your account</p>
                <p className="text-sm text-gray-400">
                  Use your email and password to access the dashboard
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Complete your setup</p>
                <p className="text-sm text-gray-400">
                  Configure your company settings and invite team members
                </p>
              </div>
            </li>
          </ul>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => navigate("/login")}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 mx-auto"
          >
            Go to Login
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-gray-500 mt-6"
        >
          Need help? Contact our support team at{" "}
          <a
            href="mailto:support@erpx-ai.com"
            className="text-blue-400 hover:text-blue-300"
          >
            support@erpx-ai.com
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
