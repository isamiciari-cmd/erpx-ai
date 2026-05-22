import { useState } from "react";
import { motion } from "motion/react";
import { UseFormReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import type { AdminUser } from "../../../../lib/validation/registrationSchema";

interface AdminUserStepProps {
  form: UseFormReturn<AdminUser>;
}

export default function AdminUserStep({ form }: AdminUserStepProps) {
  const {
    register,
    formState: { errors },
    watch,
  } = form;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const password = watch("password");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Full Name */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Full Name <span className="text-red-400">*</span>
        </label>
        <input
          {...register("fullName")}
          type="text"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter full name"
        />
        {errors.fullName && (
          <p className="text-red-400 text-sm mt-1">
            {errors.fullName.message}
          </p>
        )}
      </div>

      {/* Job Title */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Job Title <span className="text-red-400">*</span>
        </label>
        <input
          {...register("jobTitle")}
          type="text"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., CEO, Managing Director"
        />
        {errors.jobTitle && (
          <p className="text-red-400 text-sm mt-1">
            {errors.jobTitle.message}
          </p>
        )}
      </div>

      {/* Email & Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Email Address <span className="text-red-400">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@company.com"
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Mobile Number <span className="text-red-400">*</span>
          </label>
          <input
            {...register("mobileNumber")}
            type="tel"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+966 50 123 4567"
          />
          {errors.mobileNumber && (
            <p className="text-red-400 text-sm mt-1">
              {errors.mobileNumber.message}
            </p>
          )}
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Password <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
            placeholder="Enter secure password"
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
        {errors.password && (
          <p className="text-red-400 text-sm mt-1">
            {errors.password.message}
          </p>
        )}
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">Password must contain:</p>
          <ul className="text-xs text-gray-500 space-y-0.5 ml-4">
            <li className={password?.match(/[A-Z]/) ? "text-green-400" : ""}>
              • At least one uppercase letter
            </li>
            <li className={password?.match(/[a-z]/) ? "text-green-400" : ""}>
              • At least one lowercase letter
            </li>
            <li className={password?.match(/[0-9]/) ? "text-green-400" : ""}>
              • At least one number
            </li>
            <li className={password?.match(/[^A-Za-z0-9]/) ? "text-green-400" : ""}>
              • At least one special character
            </li>
            <li className={password?.length >= 8 ? "text-green-400" : ""}>
              • Minimum 8 characters
            </li>
          </ul>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Confirm Password <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            {...register("confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
            placeholder="Confirm your password"
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
        {errors.confirmPassword && (
          <p className="text-red-400 text-sm mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
    </motion.div>
  );
}
