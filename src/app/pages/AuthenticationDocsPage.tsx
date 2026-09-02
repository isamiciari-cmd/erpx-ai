export default function AuthenticationDocsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Authentication & User Management Documentation</h1>
        <p className="text-gray-600">
          Complete API structure and database schema for ERPX-AI authentication system
        </p>
      </div>

      {/* Database Schema */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Database Schema: users</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-4 py-2 text-left">Field</th>
                <th className="border px-4 py-2 text-left">Type</th>
                <th className="border px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td className="border px-4 py-2 font-mono">id</td>
                <td className="border px-4 py-2">integer</td>
                <td className="border px-4 py-2">Primary key, auto-increment</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">full_name</td>
                <td className="border px-4 py-2">string</td>
                <td className="border px-4 py-2">Full name of the user</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">email</td>
                <td className="border px-4 py-2">string</td>
                <td className="border px-4 py-2">Unique email address</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">password_hash</td>
                <td className="border px-4 py-2">string</td>
                <td className="border px-4 py-2">Bcrypt hashed password</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">role_id</td>
                <td className="border px-4 py-2">string</td>
                <td className="border px-4 py-2">
                  Role identifier (SUPER_ADMIN, FINANCE_MANAGER, etc.)
                </td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">department</td>
                <td className="border px-4 py-2">string</td>
                <td className="border px-4 py-2">Department name</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">default_route</td>
                <td className="border px-4 py-2">string</td>
                <td className="border px-4 py-2">Default dashboard route after login</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="border px-4 py-2 font-mono font-bold">must_change_password</td>
                <td className="border px-4 py-2">boolean</td>
                <td className="border px-4 py-2">
                  Force password change on next login (default: true)
                </td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">status</td>
                <td className="border px-4 py-2">enum</td>
                <td className="border px-4 py-2">Active | Locked | Inactive</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">login_attempts</td>
                <td className="border px-4 py-2">integer</td>
                <td className="border px-4 py-2">Failed login attempt counter (max: 5)</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">last_login_at</td>
                <td className="border px-4 py-2">datetime</td>
                <td className="border px-4 py-2">Timestamp of last successful login</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">created_at</td>
                <td className="border px-4 py-2">datetime</td>
                <td className="border px-4 py-2">Record creation timestamp</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">updated_at</td>
                <td className="border px-4 py-2">datetime</td>
                <td className="border px-4 py-2">Last update timestamp</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">API Endpoints</h2>

        {/* Login */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
              POST
            </span>
            <code className="text-sm font-mono">/api/auth/login</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">Authenticate user and return session token</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <p className="text-xs font-semibold mb-2">Request Body:</p>
            <pre className="text-xs overflow-x-auto">{`{
  "email": "admin@ERPX-AI.COM",
  "password": "@12345"
}`}</pre>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold mb-2">Response:</p>
            <pre className="text-xs overflow-x-auto">{`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@ERPX-AI.COM",
    "role": "Super Admin",
    "must_change_password": true,
    "default_route": "/dashboard"
  }
}`}</pre>
          </div>
        </div>

        {/* Change Password */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
              POST
            </span>
            <code className="text-sm font-mono">/api/auth/change-password</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Change user password (requires authentication)
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <p className="text-xs font-semibold mb-2">Request Body:</p>
            <pre className="text-xs overflow-x-auto">{`{
  "current_password": "@12345",
  "new_password": "NewSecure@123"
}`}</pre>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold mb-2">Response:</p>
            <pre className="text-xs overflow-x-auto">{`{
  "message": "Password updated successfully",
  "must_change_password": false
}`}</pre>
          </div>
        </div>

        {/* Get Current User */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">
              GET
            </span>
            <code className="text-sm font-mono">/api/auth/me</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">Get current authenticated user details</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold mb-2">Response:</p>
            <pre className="text-xs overflow-x-auto">{`{
  "id": 1,
  "full_name": "System Administrator",
  "email": "admin@ERPX-AI.COM",
  "role": "Super Admin",
  "department": "IT",
  "default_route": "/dashboard",
  "must_change_password": false,
  "status": "Active"
}`}</pre>
          </div>
        </div>

        {/* Logout */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
              POST
            </span>
            <code className="text-sm font-mono">/api/auth/logout</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">Invalidate current session</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold mb-2">Response:</p>
            <pre className="text-xs overflow-x-auto">{`{
  "message": "Logged out successfully"
}`}</pre>
          </div>
        </div>
      </div>

      {/* Login Flow */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Complete Login Flow</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold">User enters credentials</h3>
              <p className="text-sm text-gray-600">
                Email and password (@12345 for first-time users)
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold">System validates credentials</h3>
              <p className="text-sm text-gray-600">
                Check email exists, verify password hash, check account status
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold">Check login attempts</h3>
              <p className="text-sm text-gray-600">
                If failed: increment counter. Lock account after 5 attempts.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              4
            </div>
            <div>
              <h3 className="font-semibold">Check must_change_password flag</h3>
              <p className="text-sm text-gray-600">If true: redirect to /change-password page</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              5
            </div>
            <div>
              <h3 className="font-semibold">User sets new password</h3>
              <p className="text-sm text-gray-600">
                Validate password strength, confirm match, hash with bcrypt
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              6
            </div>
            <div>
              <h3 className="font-semibold">Update database</h3>
              <p className="text-sm text-gray-600">
                Set must_change_password = false, save new password hash
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              7
            </div>
            <div>
              <h3 className="font-semibold">Redirect to dashboard</h3>
              <p className="text-sm text-gray-600">
                Navigate to user's default_route (based on role)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Implementation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Security Implementation</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Password Hashing (Bcrypt)</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs overflow-x-auto">{`// Node.js / Express example
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Hash password on registration/change
const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

// Verify password on login
const isValid = await bcrypt.compare(plainPassword, passwordHash);`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Password Validation</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs overflow-x-auto">{`function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 8)
    errors.push('Minimum 8 characters required');

  if (!/[A-Z]/.test(password))
    errors.push('Must contain uppercase letter');

  if (!/[0-9]/.test(password))
    errors.push('Must contain number');

  if (!/[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]/.test(password))
    errors.push('Must contain special character');

  return { isValid: errors.length === 0, errors };
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Account Lockout Logic</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs overflow-x-auto">{`// On failed login attempt
if (!passwordValid) {
  user.login_attempts += 1;

  if (user.login_attempts >= 5) {
    user.status = 'Locked';
    // Send notification to admin
  }

  await user.save();
  return res.status(401).json({
    error: \`Invalid credentials. \${5 - user.login_attempts} attempts remaining\`
  });
}

// On successful login
user.login_attempts = 0;
user.last_login_at = new Date();
await user.save();`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
