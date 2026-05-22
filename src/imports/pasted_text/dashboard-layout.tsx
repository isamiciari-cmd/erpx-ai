import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Boxes,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("dashboard");

  const menu = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
    { id: "finance", name: "Finance", icon: DollarSign },
    { id: "hr", name: "HR", icon: Users },
    { id: "inventory", name: "Inventory", icon: Boxes },
    { id: "pos", name: "POS Terminals", icon: ShoppingCart },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0B0F19] text-white">

      {/* 🔥 Sidebar */}
      <motion.div
        animate={{ width: collapsed ? 80 : 240 }}
        className="bg-[#111827] border-r border-gray-800 flex flex-col transition-all"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {!collapsed && <h1 className="text-lg font-bold text-blue-400">ERPX</h1>}
          <button onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>

        {/* Menu */}
        <div className="flex-1 p-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-2 transition
                  ${isActive
                    ? "bg-blue-500/20 text-blue-400"
                    : "hover:bg-gray-800 text-gray-300"
                  }`}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.name}</span>}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-xs text-gray-400">
          {!collapsed && "ERPX v1.0"}
        </div>
      </motion.div>

      {/* 🔥 Main Content */}
      <div className="flex-1 p-6 overflow-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl capitalize">{active}</h1>
          <div className="bg-gray-800 px-4 py-2 rounded-xl">Admin</div>
        </div>

        {/* Dynamic Content */}
        {active === "dashboard" && <MainDashboard />}
        {active === "pos" && <POSTerminals />}

      </div>
    </div>
  );
}

---

function MainDashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">

      <Card title="Revenue" value="SAR 120,000" />
      <Card title="Expenses" value="SAR 45,000" />
      <Card title="Employees" value="120" />
      <Card title="Active POS" value="8" />

      <div className="col-span-4 bg-[#111827] p-6 rounded-xl">
        <h2 className="mb-4 text-lg">System Overview</h2>
        <p className="text-gray-400">
          Real-time analytics and company performance will be displayed here.
        </p>
      </div>

    </div>
  );
}

---

# 🏪🔥 POS SYSTEM (للشركات وليس المطاعم)

function POSTerminals() {
  const terminals = [
    { name: "Branch Riyadh", status: "Active", sales: 32000 },
    { name: "Branch Jeddah", status: "Active", sales: 28000 },
    { name: "Branch Dammam", status: "Offline", sales: 12000 },
  ];

  return (
    <div>

      {/* Header */}
      <div className="flex justify-between mb-6">
        <h2 className="text-xl">POS Terminals</h2>
        <button className="bg-blue-500 px-4 py-2 rounded-xl">
          + Add Terminal
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-xl overflow-hidden">

        <table className="w-full text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="p-4">Terminal</th>
              <th>Status</th>
              <th>Sales</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {terminals.map((t, i) => (
              <tr key={i} className="border-t border-gray-800 hover:bg-gray-900">

                <td className="p-4">{t.name}</td>

                <td>
                  <span className={`px-2 py-1 rounded text-xs
                    ${t.status === "Active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                    }`}>
                    {t.status}
                  </span>
                </td>

                <td>{t.sales} SAR</td>

                <td>
                  <button className="text-blue-400">View</button>
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>
    </div>
  );
}

---

function Card({ title, value }) {
  return (
    <div className="bg-[#111827] p-4 rounded-xl border border-gray-800">
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-xl mt-1">{value}</h2>
    </div>
  );
}