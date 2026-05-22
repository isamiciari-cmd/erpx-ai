import { useState } from "react";
import { motion } from "motion/react";
import { Shield, Users, Save, RotateCcw, Check, X } from "lucide-react";

// Roles
const roles = [
  { id: "super_admin", name: "Super Admin", color: "from-red-500 to-pink-500" },
  { id: "admin", name: "Admin", color: "from-blue-500 to-cyan-500" },
  { id: "manager", name: "Manager", color: "from-purple-500 to-pink-500" },
  { id: "user", name: "User", color: "from-green-500 to-emerald-500" },
  { id: "viewer", name: "Viewer", color: "from-gray-500 to-gray-600" },
];

// Modules with permissions
const modules = [
  { id: "dashboard", name: "Dashboard" },
  { id: "inventory", name: "Inventory" },
  { id: "sales", name: "Sales" },
  { id: "purchases", name: "Purchases" },
  { id: "finance", name: "Finance" },
  { id: "hr", name: "HR" },
  { id: "users", name: "Users" },
  { id: "settings", name: "Settings" },
  { id: "reports", name: "Reports" },
  { id: "ai_center", name: "AI Center" },
];

// Permission types
const permissionTypes = [
  { id: "create", name: "Create", color: "text-green-400" },
  { id: "read", name: "Read", color: "text-blue-400" },
  { id: "update", name: "Update", color: "text-yellow-400" },
  { id: "delete", name: "Delete", color: "text-red-400" },
];

// Initial permissions (example data)
const initialPermissions: Record<string, Record<string, boolean>> = {
  super_admin: {
    "dashboard-create": true,
    "dashboard-read": true,
    "dashboard-update": true,
    "dashboard-delete": true,
    "inventory-create": true,
    "inventory-read": true,
    "inventory-update": true,
    "inventory-delete": true,
    "sales-create": true,
    "sales-read": true,
    "sales-update": true,
    "sales-delete": true,
    "purchases-create": true,
    "purchases-read": true,
    "purchases-update": true,
    "purchases-delete": true,
    "finance-create": true,
    "finance-read": true,
    "finance-update": true,
    "finance-delete": true,
    "hr-create": true,
    "hr-read": true,
    "hr-update": true,
    "hr-delete": true,
    "users-create": true,
    "users-read": true,
    "users-update": true,
    "users-delete": true,
    "settings-create": true,
    "settings-read": true,
    "settings-update": true,
    "settings-delete": true,
    "reports-create": true,
    "reports-read": true,
    "reports-update": true,
    "reports-delete": true,
    "ai_center-create": true,
    "ai_center-read": true,
    "ai_center-update": true,
    "ai_center-delete": true,
  },
  admin: {
    "dashboard-read": true,
    "inventory-create": true,
    "inventory-read": true,
    "inventory-update": true,
    "sales-create": true,
    "sales-read": true,
    "sales-update": true,
    "purchases-read": true,
    "finance-read": true,
    "hr-read": true,
    "users-read": true,
    "settings-read": true,
    "reports-read": true,
    "ai_center-read": true,
  },
  manager: {
    "dashboard-read": true,
    "inventory-read": true,
    "inventory-update": true,
    "sales-create": true,
    "sales-read": true,
    "sales-update": true,
    "purchases-read": true,
    "finance-read": true,
    "reports-read": true,
  },
  user: {
    "dashboard-read": true,
    "inventory-read": true,
    "sales-read": true,
    "purchases-read": true,
  },
  viewer: {
    "dashboard-read": true,
    "inventory-read": true,
    "sales-read": true,
    "reports-read": true,
  },
};

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState("super_admin");
  const [permissions, setPermissions] = useState(initialPermissions);
  const [hasChanges, setHasChanges] = useState(false);

  const togglePermission = (module: string, permission: string) => {
    const key = `${module}-${permission}`;
    setPermissions({
      ...permissions,
      [selectedRole]: {
        ...permissions[selectedRole],
        [key]: !permissions[selectedRole]?.[key],
      },
    });
    setHasChanges(true);
  };

  const hasPermission = (module: string, permission: string) => {
    const key = `${module}-${permission}`;
    return permissions[selectedRole]?.[key] || false;
  };

  const saveChanges = () => {
    // Simulate save
    setTimeout(() => {
      setHasChanges(false);
      alert("Permissions saved successfully!");
    }, 500);
  };

  const resetChanges = () => {
    setPermissions(initialPermissions);
    setHasChanges(false);
  };

  const selectAllForModule = (moduleId: string) => {
    const updatedPermissions = { ...permissions[selectedRole] };
    permissionTypes.forEach((perm) => {
      updatedPermissions[`${moduleId}-${perm.id}`] = true;
    });
    setPermissions({
      ...permissions,
      [selectedRole]: updatedPermissions,
    });
    setHasChanges(true);
  };

  const deselectAllForModule = (moduleId: string) => {
    const updatedPermissions = { ...permissions[selectedRole] };
    permissionTypes.forEach((perm) => {
      updatedPermissions[`${moduleId}-${perm.id}`] = false;
    });
    setPermissions({
      ...permissions,
      [selectedRole]: updatedPermissions,
    });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            Roles & Permissions
          </h1>
          <p className="text-gray-400 mt-1">Manage access control for all roles</p>
        </div>

        {/* Save/Reset Buttons */}
        {hasChanges && (
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetChanges}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={saveChanges}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/30"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </motion.button>
          </div>
        )}
      </div>

      {/* Role Selection */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Select Role</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {roles.map((role) => (
            <motion.button
              key={role.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRole(role.id)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                selectedRole === role.id
                  ? `bg-gradient-to-r ${role.color} text-white shadow-lg`
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {role.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">
            Permission Matrix -{" "}
            <span className="text-blue-400">
              {roles.find((r) => r.id === selectedRole)?.name}
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 border-r border-gray-800">
                  Module
                </th>
                {permissionTypes.map((perm) => (
                  <th
                    key={perm.id}
                    className={`px-6 py-4 text-center text-sm font-semibold ${perm.color} border-r border-gray-800`}
                  >
                    {perm.name}
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module, index) => (
                <motion.tr
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4 text-white font-medium border-r border-gray-800">
                    {module.name}
                  </td>
                  {permissionTypes.map((perm) => (
                    <td
                      key={perm.id}
                      className="px-6 py-4 text-center border-r border-gray-800"
                    >
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => togglePermission(module.id, perm.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                          hasPermission(module.id, perm.id)
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                            : "bg-gray-700 text-gray-500 hover:bg-gray-600"
                        }`}
                      >
                        {hasPermission(module.id, perm.id) ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                      </motion.button>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => selectAllForModule(module.id)}
                        className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-all"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => deselectAllForModule(module.id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {permissionTypes.map((perm) => {
          const count = modules.filter((module) =>
            hasPermission(module.id, perm.id)
          ).length;
          const percentage = (count / modules.length) * 100;

          return (
            <motion.div
              key={perm.id}
              whileHover={{ y: -4 }}
              className="bg-[#111827] border border-gray-800 rounded-xl p-6"
            >
              <h4 className={`text-sm font-semibold ${perm.color} mb-2`}>{perm.name}</h4>
              <p className="text-3xl font-bold text-white mb-3">
                {count}/{modules.length}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r ${
                    perm.id === "create"
                      ? "from-green-500 to-emerald-500"
                      : perm.id === "read"
                      ? "from-blue-500 to-cyan-500"
                      : perm.id === "update"
                      ? "from-yellow-500 to-orange-500"
                      : "from-red-500 to-pink-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
