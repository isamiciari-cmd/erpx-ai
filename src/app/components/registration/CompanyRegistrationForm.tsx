import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Building2, User, Package, FileCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  companyInfoSchema,
  adminUserSchema,
  subscriptionSchema,
  reviewSchema,
  type CompanyInfo,
  type AdminUser,
  type Subscription,
  type Review,
} from "../../../lib/validation/registrationSchema";
import { registerCompany } from "../../../services/companyRegistrationService";
import CompanyInfoStep from "./steps/CompanyInfoStep";
import AdminUserStep from "./steps/AdminUserStep";
import SubscriptionStep from "./steps/SubscriptionStep";
import ReviewStep from "./steps/ReviewStep";

const steps = [
  { number: 1, title: "Company Information", icon: Building2, schema: companyInfoSchema },
  { number: 2, title: "Admin User", icon: User, schema: adminUserSchema },
  { number: 3, title: "Subscription & Modules", icon: Package, schema: subscriptionSchema },
  { number: 4, title: "Review & Submit", icon: FileCheck, schema: reviewSchema },
];

export default function CompanyRegistrationForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data for each step
  const [companyData, setCompanyData] = useState<Partial<CompanyInfo>>({});
  const [adminData, setAdminData] = useState<Partial<AdminUser>>({});
  const [subscriptionData, setSubscriptionData] = useState<Partial<Subscription>>({
    numberOfBranches: 1,
    numberOfUsers: 5,
    modules: {
      finance: true,
      hr: false,
      inventory: false,
      pos: false,
      reports: true,
      aiAssistant: false,
    },
  });
  const [reviewData, setReviewData] = useState<Partial<Review>>({
    termsAccepted: false,
  });

  // Form hooks for current step
  const companyForm = useForm<CompanyInfo>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: companyData,
  });

  const adminForm = useForm<AdminUser>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: adminData,
  });

  const subscriptionForm = useForm<Subscription>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: subscriptionData,
  });

  const reviewForm = useForm<Review>({
    resolver: zodResolver(reviewSchema),
    defaultValues: reviewData,
  });

  const getCurrentForm = () => {
    switch (currentStep) {
      case 1:
        return companyForm;
      case 2:
        return adminForm;
      case 3:
        return subscriptionForm;
      case 4:
        return reviewForm;
      default:
        return companyForm;
    }
  };

  const handleNext = async () => {
    const form = getCurrentForm();
    const isValid = await form.trigger();

    if (!isValid) {
      return;
    }

    // Save current step data
    if (currentStep === 1) {
      setCompanyData(form.getValues() as CompanyInfo);
    } else if (currentStep === 2) {
      setAdminData(form.getValues() as AdminUser);
    } else if (currentStep === 3) {
      setSubscriptionData(form.getValues() as Subscription);
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // Final validation
    const reviewValid = await reviewForm.trigger();
    if (!reviewValid) {
      setLoading(false);
      return;
    }

    // Prepare complete registration data
    const completeData = {
      company: companyData as CompanyInfo,
      adminUser: adminData as AdminUser,
      subscription: subscriptionData as Subscription,
      review: reviewForm.getValues() as Review,
    };

    // Submit registration
    const result = await registerCompany(completeData);

    if (result.success) {
      // Redirect to success page or login
      navigate("/registration-success", {
        state: {
          email: completeData.adminUser.email,
          companyName: completeData.company.companyName,
        },
      });
    } else {
      setError(result.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  const StepIcon = steps[currentStep - 1].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Register New Company
          </h1>
          <p className="text-gray-400">
            Create your ERPX-AI enterprise account
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep > step.number
                        ? "bg-green-500 border-green-500"
                        : currentStep === step.number
                        ? "bg-blue-500 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <step.icon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center hidden sm:block">
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      currentStep > step.number
                        ? "bg-green-500"
                        : "bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8"
        >
          {/* Current Step Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <StepIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {steps[currentStep - 1].title}
              </h2>
              <p className="text-sm text-gray-400">
                Step {currentStep} of {steps.length}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <CompanyInfoStep form={companyForm} key="step1" />
            )}
            {currentStep === 2 && (
              <AdminUserStep form={adminForm} key="step2" />
            )}
            {currentStep === 3 && (
              <SubscriptionStep form={subscriptionForm} key="step3" />
            )}
            {currentStep === 4 && (
              <ReviewStep
                form={reviewForm}
                companyData={companyData}
                adminData={adminData}
                subscriptionData={subscriptionData}
                key="step4"
              />
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4 mt-8">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={loading}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <div className="flex-1" />

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? "Creating Account..." : "Create Company Account"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
