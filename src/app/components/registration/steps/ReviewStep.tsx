import { motion } from 'motion/react';
import { UseFormReturn } from 'react-hook-form';
import { Building2, User, Package } from 'lucide-react';
import type {
  CompanyInfo,
  AdminUser,
  Subscription,
  Review,
} from '../../../../lib/validation/registrationSchema';

interface ReviewStepProps {
  form: UseFormReturn<Review>;
  companyData: Partial<CompanyInfo>;
  adminData: Partial<AdminUser>;
  subscriptionData: Partial<Subscription>;
}

export default function ReviewStep({
  form,
  companyData,
  adminData,
  subscriptionData,
}: ReviewStepProps) {
  const {
    register,
    formState: { errors },
  } = form;

  const selectedModules = Object.entries(subscriptionData.modules || {})
    .filter(([_, enabled]) => enabled)
    .map(([key, _]) => key);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Company Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Company Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Company Name</p>
            <p className="text-white font-semibold">{companyData.companyName}</p>
          </div>
          <div>
            <p className="text-gray-400">CR Number</p>
            <p className="text-white font-semibold">{companyData.commercialRegistrationNumber}</p>
          </div>
          <div>
            <p className="text-gray-400">Business Sector</p>
            <p className="text-white font-semibold">{companyData.businessSector}</p>
          </div>
          <div>
            <p className="text-gray-400">Company Size</p>
            <p className="text-white font-semibold">{companyData.companySize}</p>
          </div>
          <div>
            <p className="text-gray-400">Location</p>
            <p className="text-white font-semibold">
              {companyData.city}, {companyData.country}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Website</p>
            <p className="text-white font-semibold">{companyData.website || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Admin User */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-bold text-white">Administrator</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Full Name</p>
            <p className="text-white font-semibold">{adminData.fullName}</p>
          </div>
          <div>
            <p className="text-gray-400">Job Title</p>
            <p className="text-white font-semibold">{adminData.jobTitle}</p>
          </div>
          <div>
            <p className="text-gray-400">Email</p>
            <p className="text-white font-semibold">{adminData.email}</p>
          </div>
          <div>
            <p className="text-gray-400">Mobile</p>
            <p className="text-white font-semibold">{adminData.mobileNumber}</p>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Subscription</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-400">Plan</p>
            <p className="text-white font-semibold capitalize">{subscriptionData.plan}</p>
          </div>
          <div>
            <p className="text-gray-400">Branches</p>
            <p className="text-white font-semibold">{subscriptionData.numberOfBranches}</p>
          </div>
          <div>
            <p className="text-gray-400">Users</p>
            <p className="text-white font-semibold">{subscriptionData.numberOfUsers}</p>
          </div>
          <div>
            <p className="text-gray-400">Selected Modules</p>
            <p className="text-white font-semibold">{selectedModules.length}</p>
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Modules:</p>
          <div className="flex flex-wrap gap-2">
            {selectedModules.map((module) => (
              <span
                key={module}
                className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold capitalize"
              >
                {module}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            {...register('termsAccepted')}
            type="checkbox"
            className="w-5 h-5 mt-0.5 bg-white/5 border border-white/10 rounded focus:ring-2 focus:ring-blue-500 text-blue-500"
          />
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">
              I agree to the Terms & Conditions and Privacy Policy{' '}
              <span className="text-red-400">*</span>
            </p>
            <p className="text-gray-400 text-xs mt-1">
              By registering, you agree to ERPX-AI's terms of service and privacy policy. You can
              review them at any time.
            </p>
          </div>
        </label>
        {errors.termsAccepted && (
          <p className="text-red-400 text-sm mt-2">{errors.termsAccepted.message}</p>
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> After creating your account, you'll receive a verification email.
          Please verify your email to activate your account and access all features.
        </p>
      </div>
    </motion.div>
  );
}
