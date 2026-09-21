import { supabase } from '../lib/supabase';
import type { CompleteRegistration } from '../lib/validation/registrationSchema';

export interface RegistrationResponse {
  success: boolean;
  message: string;
  companyId?: string;
  userId?: string;
  tenantId?: string;
  branchId?: string;
  roleId?: string;
  requiresEmailConfirmation?: boolean;
  error?: string;
}

/**
 * Register a new company with its first administrator.
 *
 * Flow:
 * 1. Create Supabase Auth user.
 * 2. Require an authenticated session.
 * 3. Execute the secure database registration RPC.
 *
 * The database RPC creates:
 * - Tenant
 * - Profile
 * - user_tenants
 * - Company
 * - Main Branch
 * - ERP User
 * - user_roles
 */
export async function registerCompany(
  data: CompleteRegistration
): Promise<RegistrationResponse> {
  try {
    /*
     * Step 1: Create Auth user
     */
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: data.adminUser.email,
        password: data.adminUser.password,
        options: {
          data: {
            full_name: data.adminUser.fullName,
            job_title: data.adminUser.jobTitle,
            mobile_number: data.adminUser.mobileNumber,
          },
        },
      });

    if (authError) {
      const message = authError.message?.toLowerCase() || '';

      if (
        message.includes('already registered') ||
        message.includes('already exists') ||
        message.includes('user already registered')
      ) {
        return {
          success: false,
          message: 'This email is already registered',
          error: authError.message,
        };
      }

      return {
        success: false,
        message: 'Failed to create user account',
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'Failed to create user account',
        error: 'No user data returned from Supabase Auth',
      };
    }

    const userId = authData.user.id;

    /*
     * Step 2: Check authentication session
     */
    let session = authData.session;

    /*
     * signUp() may return a user without a session when
     * email confirmation is enabled.
     */
    if (!session) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        return {
          success: false,
          message: 'Unable to establish an authenticated session',
          error: sessionError.message,
        };
      }

      session = sessionData.session;
    }

    /*
     * The registration RPC requires an authenticated user.
     */
    if (!session) {
      return {
        success: false,
        message:
          'Account created. Please confirm your email address, then sign in to complete company registration.',
        userId,
        requiresEmailConfirmation: true,
      };
    }

    /*
     * Step 3: Execute secure database registration RPC
     */
    const { data: registrationResult, error: registrationError } =
      await supabase.rpc('register_company_account', {
        p_company_name: data.company.companyName,
        p_legal_name: data.company.companyName,
        p_tax_id: data.company.commercialRegistrationNumber,
        p_vat_number: data.company.vatNumber || '',
        p_business_sector: data.company.businessSector,
        p_company_size: data.company.companySize,
        p_country: data.company.country,
        p_city: data.company.city,
        p_address: data.company.address,
        p_website: data.company.website || '',

        /*
         * Default branch
         */
        p_branch_name: 'Main Branch',
        p_branch_code: 'MAIN',

        /*
         * Subscription
         */
        p_subscription_plan: data.subscription.plan,
        p_billing_cycle:
          data.subscription.plan === 'trial'
            ? 'trial'
            : data.subscription.plan,

        p_max_branches: data.subscription.numberOfBranches,
        p_max_users: data.subscription.numberOfUsers,
        p_modules: data.subscription.modules,

        /*
         * Administrator
         */
        p_full_name: data.adminUser.fullName,
        p_job_title: data.adminUser.jobTitle,
        p_mobile_number: data.adminUser.mobileNumber,
      });

    if (registrationError) {
      console.error(
        'Company registration RPC error:',
        registrationError
      );

      return {
        success: false,
        message: 'Failed to complete company registration',
        userId,
        error: registrationError.message,
      };
    }

    if (!registrationResult) {
      return {
        success: false,
        message: 'Registration completed without a result',
        userId,
        error: 'RPC returned an empty result',
      };
    }

    /*
     * Step 4: Validate RPC result
     */
    if (!registrationResult.success) {
      return {
        success: false,
        message: 'Company registration failed',
        userId,
        error: 'Registration RPC returned an unsuccessful result',
      };
    }

    return {
      success: true,
      message: 'Company account created successfully',
      userId: registrationResult.user_id,
      tenantId: registrationResult.tenant_id,
      companyId: registrationResult.company_id,
      branchId: registrationResult.branch_id,
      roleId: registrationResult.role_id,
    };
  } catch (error: unknown) {
    console.error('Registration error:', error);

    return {
      success: false,
      message: 'An unexpected error occurred during registration',
      error:
        error instanceof Error
          ? error.message
          : 'Unknown registration error',
    };
  }
}

/**
 * Check whether an email already exists in the ERP users table.
 */
export async function checkEmailExists(
  email: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Check whether a commercial registration number already exists.
 */
export async function checkCommercialRegExists(
  crNumber: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('tax_id')
      .eq('tax_id', crNumber)
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}