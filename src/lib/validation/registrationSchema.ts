import { z } from 'zod';

// Company Information Schema
export const companyInfoSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  commercialRegistrationNumber: z.string().min(1, 'Commercial registration number is required'),
  vatNumber: z.string().optional(),
  businessSector: z.string().min(1, 'Business sector is required'),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+'], {
    required_error: 'Please select company size',
  }),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(5, 'Please provide a valid address'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

// Admin User Schema
export const adminUserSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    jobTitle: z.string().min(1, 'Job title is required'),
    email: z.string().email('Please enter a valid email address'),
    mobileNumber: z.string().min(10, 'Please enter a valid mobile number'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Subscription Schema
export const subscriptionSchema = z.object({
  plan: z.enum(['trial', 'monthly', 'yearly'], {
    required_error: 'Please select a subscription plan',
  }),
  numberOfBranches: z.number().min(1, 'Number of branches must be at least 1'),
  numberOfUsers: z.number().min(1, 'Number of users must be at least 1'),
  modules: z
    .object({
      finance: z.boolean(),
      hr: z.boolean(),
      inventory: z.boolean(),
      pos: z.boolean(),
      reports: z.boolean(),
      aiAssistant: z.boolean(),
    })
    .refine((modules) => Object.values(modules).some((enabled) => enabled), {
      message: 'Please select at least one module',
    }),
});

// Review & Submit Schema
export const reviewSchema = z.object({
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

// Complete Registration Schema
export const completeRegistrationSchema = z.object({
  company: companyInfoSchema,
  adminUser: adminUserSchema,
  subscription: subscriptionSchema,
  review: reviewSchema,
});

// Types
export type CompanyInfo = z.infer<typeof companyInfoSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type CompleteRegistration = z.infer<typeof completeRegistrationSchema>;
