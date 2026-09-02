import { motion } from 'motion/react';
import { UseFormReturn } from 'react-hook-form';
import type { CompanyInfo } from '../../../../lib/validation/registrationSchema';

interface CompanyInfoStepProps {
  form: UseFormReturn<CompanyInfo>;
}

const businessSectors = [
  'Technology',
  'Retail',
  'Manufacturing',
  'Healthcare',
  'Finance',
  'Education',
  'Real Estate',
  'Food & Beverage',
  'Transportation',
  'Construction',
  'Other',
];

const countries = [
  'Saudi Arabia',
  'United Arab Emirates',
  'Kuwait',
  'Qatar',
  'Bahrain',
  'Oman',
  'Egypt',
  'Jordan',
  'Lebanon',
  'Other',
];

export default function CompanyInfoStep({ form }: CompanyInfoStepProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Company Name */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Company Name <span className="text-red-400">*</span>
        </label>
        <input
          {...register('companyName')}
          type="text"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter company name"
        />
        {errors.companyName && (
          <p className="text-red-400 text-sm mt-1">{errors.companyName.message}</p>
        )}
      </div>

      {/* Commercial Registration & VAT Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Commercial Registration Number <span className="text-red-400">*</span>
          </label>
          <input
            {...register('commercialRegistrationNumber')}
            type="text"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1234567890"
          />
          {errors.commercialRegistrationNumber && (
            <p className="text-red-400 text-sm mt-1">
              {errors.commercialRegistrationNumber.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">VAT Number</label>
          <input
            {...register('vatNumber')}
            type="text"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional"
          />
          {errors.vatNumber && (
            <p className="text-red-400 text-sm mt-1">{errors.vatNumber.message}</p>
          )}
        </div>
      </div>

      {/* Business Sector & Company Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Business Sector <span className="text-red-400">*</span>
          </label>
          <select
            {...register('businessSector')}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select sector</option>
            {businessSectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
          {errors.businessSector && (
            <p className="text-red-400 text-sm mt-1">{errors.businessSector.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Company Size <span className="text-red-400">*</span>
          </label>
          <select
            {...register('companySize')}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select size</option>
            <option value="1-10">1-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="201-500">201-500 employees</option>
            <option value="500+">500+ employees</option>
          </select>
          {errors.companySize && (
            <p className="text-red-400 text-sm mt-1">{errors.companySize.message}</p>
          )}
        </div>
      </div>

      {/* Country & City */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Country <span className="text-red-400">*</span>
          </label>
          <select
            {...register('country')}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          {errors.country && <p className="text-red-400 text-sm mt-1">{errors.country.message}</p>}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            City <span className="text-red-400">*</span>
          </label>
          <input
            {...register('city')}
            type="text"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter city"
          />
          {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city.message}</p>}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Address <span className="text-red-400">*</span>
        </label>
        <textarea
          {...register('address')}
          rows={3}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter complete address"
        />
        {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address.message}</p>}
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Official Website</label>
        <input
          {...register('website')}
          type="url"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com (optional)"
        />
        {errors.website && <p className="text-red-400 text-sm mt-1">{errors.website.message}</p>}
      </div>
    </motion.div>
  );
}
