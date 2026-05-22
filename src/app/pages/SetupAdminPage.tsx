import { useState } from "react";
import { motion } from "motion/react";
import { Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function SetupAdminPage() {
  const [email, setEmail] = useState("admin-1@erpx-ai.com");
  const [password, setPassword] = useState("@12345@");
  const [firstName, setFirstName] = useState("Admin");
  const [lastName, setLastName] = useState("User");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [details, setDetails] = useState("");

  const createAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setDetails("");
    setLoading(true);

    try {
      // Step 1: Sign up the user
      setDetails("Creating authentication user...");
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: undefined, // Don't send confirmation email
        },
      });

      if (signUpError) {
        throw new Error(`Auth signup failed: ${signUpError.message}`);
      }

      if (!authData.user) {
        throw new Error("User creation failed - no user returned");
      }

      setDetails(`Auth user created with ID: ${authData.user.id}`);

      // Step 2: Get admin role and company
      setDetails("Finding admin role and company...");
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "admin")
        .single();

      if (roleError || !roleData) {
        throw new Error("Admin role not found in database");
      }

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, name")
        .limit(1)
        .single();

      if (companyError || !companyData) {
        throw new Error("No company found in database");
      }

      const { data: branchData } = await supabase
        .from("branches")
        .select("id")
        .eq("company_id", companyData.id)
        .limit(1)
        .single();

      // Step 3: Create user record in database
      setDetails("Creating user record in database...");
      const { error: insertError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role_id: roleData.id,
        company_id: companyData.id,
        branch_id: branchData?.id || null,
        department: "Management",
        position: "System Administrator",
        status: "active",
      });

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Success!
      setSuccess(true);
      setDetails(
        `✅ Admin user created successfully!\n\nYou can now login with:\nEmail: ${email}\nPassword: ${password}`
      );
      setLoading(false);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "Failed to create admin user");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-green-500/50 rounded-2xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Admin User Created!
          </h2>
          <div className="bg-gray-800/50 rounded-xl p-6 mb-6 text-left">
            <p className="text-sm text-gray-400 mb-4">Login Credentials:</p>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-gray-500">Email:</span>{" "}
                <span className="text-blue-400">{email}</span>
              </div>
              <div>
                <span className="text-gray-500">Password:</span>{" "}
                <span className="text-blue-400">{password}</span>
              </div>
            </div>
          </div>
          <a
            href="/login"
            className="block w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            Go to Login
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Create Admin User
          </h2>
          <p className="text-gray-400">
            Set up your first administrator account
          </p>
        </div>

        <form onSubmit={createAdminUser} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-400 font-semibold mb-1">
                  Error
                </p>
                <p className="text-xs text-red-300">{error}</p>
              </div>
            </div>
          )}

          {details && !error && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
              <p className="text-sm text-blue-300 whitespace-pre-line">
                {details}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Creating Admin User..." : "Create Admin User"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-xs text-yellow-300">
            <strong>Note:</strong> This page creates your first admin account.
            After setup, you can login and create additional users from the
            admin panel.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
