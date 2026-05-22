import { supabase } from "../lib/supabase";
import type { CompleteRegistration } from "../lib/validation/registrationSchema";

export interface RegistrationResponse {
  success: boolean;
  message: string;
  companyId?: string;
  userId?: string;
  error?: string;
}

/**
 * Register a new company with admin user
 */
export async function registerCompany(
  data: CompleteRegistration
): Promise<RegistrationResponse> {
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
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
      if (authError.message.includes("already registered")) {
        return {
          success: false,
          message: "This email is already registered",
          error: authError.message,
        };
      }
      return {
        success: false,
        message: "Failed to create user account",
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: "Failed to create user account",
        error: "No user data returned",
      };
    }

    const userId = authData.user.id;

    // Step 2: Create company record
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .insert([
        {
          name: data.company.companyName,
          commercial_registration_number: data.company.commercialRegistrationNumber,
          vat_number: data.company.vatNumber || null,
          business_sector: data.company.businessSector,
          company_size: data.company.companySize,
          country: data.company.country,
          city: data.company.city,
          address: data.company.address,
          website: data.company.website || null,
          currency: "SAR",
          status: "active",
        },
      ])
      .select()
      .single();

    if (companyError) {
      console.error("Company creation error:", companyError);
      return {
        success: false,
        message: "Failed to create company record",
        error: companyError.message,
      };
    }

    const companyId = companyData.id;

    // Step 3: Get admin role
    const { data: adminRole, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "admin")
      .single();

    if (roleError || !adminRole) {
      console.error("Role fetch error:", roleError);
      return {
        success: false,
        message: "Failed to assign admin role",
        error: roleError?.message || "Admin role not found",
      };
    }

    // Step 4: Create user profile
    const { error: userError } = await supabase.from("users").insert([
      {
        id: userId,
        company_id: companyId,
        email: data.adminUser.email,
        first_name: data.adminUser.fullName.split(" ")[0],
        last_name: data.adminUser.fullName.split(" ").slice(1).join(" ") || "",
        phone_number: data.adminUser.mobileNumber,
        position: data.adminUser.jobTitle,
        role_id: adminRole.id,
        department: "Management",
        status: "active",
      },
    ]);

    if (userError) {
      console.error("User profile creation error:", userError);
      return {
        success: false,
        message: "Failed to create user profile",
        error: userError.message,
      };
    }

    // Step 5: Create default branch
    const { error: branchError } = await supabase.from("branches").insert([
      {
        company_id: companyId,
        name: "Main Branch",
        city: data.company.city,
        address: data.company.address,
        country: data.company.country,
        is_main: true,
        status: "active",
      },
    ]);

    if (branchError) {
      console.error("Branch creation error:", branchError);
      // Non-critical error, continue
    }

    // Step 6: Create subscription record
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert([
        {
          company_id: companyId,
          plan_name: data.subscription.plan,
          billing_cycle: data.subscription.plan === "trial" ? "trial" : data.subscription.plan,
          max_branches: data.subscription.numberOfBranches,
          max_users: data.subscription.numberOfUsers,
          status: "active",
          started_at: new Date().toISOString(),
        },
      ]);

    if (subscriptionError) {
      console.error("Subscription creation error:", subscriptionError);
      // Non-critical error, continue
    }

    // Step 7: Create company modules
    const selectedModules = Object.entries(data.subscription.modules)
      .filter(([_, enabled]) => enabled)
      .map(([moduleName, _]) => ({
        company_id: companyId,
        module_name: moduleName,
        is_enabled: true,
      }));

    if (selectedModules.length > 0) {
      const { error: modulesError } = await supabase
        .from("company_modules")
        .insert(selectedModules);

      if (modulesError) {
        console.error("Modules creation error:", modulesError);
        // Non-critical error, continue
      }
    }

    // Success!
    return {
      success: true,
      message: "Company account created successfully",
      companyId,
      userId,
    };
  } catch (error: any) {
    console.error("Registration error:", error);
    return {
      success: false,
      message: "An unexpected error occurred during registration",
      error: error.message,
    };
  }
}

/**
 * Check if email is already registered
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Check if commercial registration number exists
 */
export async function checkCommercialRegExists(
  crNumber: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("commercial_registration_number")
      .eq("commercial_registration_number", crNumber)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
