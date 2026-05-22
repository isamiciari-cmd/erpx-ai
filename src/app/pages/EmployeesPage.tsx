import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Briefcase,
} from "lucide-react";

interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  salary: number;
  contractStart: string;
  contractEnd: string;
  status: "active" | "inactive";
  email: string;
  phone: string;
}

// Mock API
const employeeAPI = {
  employees: [
    {
      id: 1,
      name: "Ahmed Al-Mutairi",
      position: "Senior Developer",
      department: "IT",
      salary: 12000,
      contractStart: "2023-01-15",
      contractEnd: "2025-01-15",
      status: "active" as const,
      email: "ahmed@erpx.sa",
      phone: "+966 50 123 4567",
    },
    {
      id: 2,
      name: "Fatima Hassan",
      position: "Finance Manager",
      department: "Finance",
      salary: 15000,
      contractStart: "2022-06-01",
      contractEnd: "2024-06-01",
      status: "active" as const,
      email: "fatima@erpx.sa",
      phone: "+966 55 234 5678",
    },
    {
      id: 3,
      name: "Mohammed Saeed",
      position: "HR Specialist",
      department: "HR",
      salary: 10000,
      contractStart: "2023-03-10",
      contractEnd: "2025-03-10",
      status: "active" as const,
      email: "mohammed@erpx.sa",
      phone: "+966 50 345 6789",
    },
  ] as Employee[],
  nextId: 4,

  async findAll(): Promise<Employee[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.employees]), 300));
  },

  async create(data: Omit<Employee, "id">): Promise<Employee> {
    const employee = { ...data, id: this.nextId++ };
    this.employees.push(employee);
    return new Promise((resolve) => setTimeout(() => resolve(employee), 300));
  },

  async update(id: number, data: Partial<Employee>): Promise<void> {
    const employee = this.employees.find((e) => e.id === id);
    if (employee) {
      Object.assign(employee, data);
    }
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },

  async delete(id: number): Promise<void> {
    this.employees = this.employees.filter((e) => e.id !== id);
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const fetchEmployees = async () => {
    const data = await employeeAPI.findAll();
    setEmployees(data);
  };

  const createEmployee = async () => {
    if (!name || !position || !salary) return;

    await employeeAPI.create({
      name,
      position,
      department,
      salary: Number(salary),
      contractStart,
      contractEnd,
      status: "active",
      email,
      phone,
    });

    // Reset form
    setName("");
    setPosition("");
    setDepartment("");
    setSalary("");
    setContractStart("");
    setContractEnd("");
    setEmail("");
    setPhone("");
    setShowForm(false);
    fetchEmployees();
  };

  const deleteEmployee = async (id: number) => {
    if (confirm("Are you sure you want to remove this employee?")) {
      await employeeAPI.delete(id);
      fetchEmployees();
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const stats = [
    {
      label: "Total Employees",
      value: employees.length.toString(),
      icon: Users,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Active Contracts",
      value: employees.filter((e) => e.status === "active").length.toString(),
      icon: Briefcase,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Total Payroll",
      value: `SAR ${employees.reduce((sum, e) => sum + e.salary, 0).toLocaleString()}`,
      icon: DollarSign,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Departments",
      value: new Set(employees.map((e) => e.department)).size.toString(),
      icon: UserCheck,
      color: "from-orange-500 to-yellow-500",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Employee Management
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all"
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg mb-4`}>
              <stat.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Add New Employee</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmed Al-Mutairi"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Position</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Senior Developer"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                <option value="IT">IT</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Monthly Salary (SAR)</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="12000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@erpx.sa"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 50 123 4567"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Contract Start</label>
              <input
                type="date"
                value={contractStart}
                onChange={(e) => setContractStart(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Contract End</label>
              <input
                type="date"
                value={contractEnd}
                onChange={(e) => setContractEnd(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createEmployee}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium"
            >
              Add Employee
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Employees Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">All Employees</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Position
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Salary
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Contract
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, i) => (
                <motion.tr
                  key={employee.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-semibold">{employee.name}</p>
                      <p className="text-xs text-gray-400">{employee.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{employee.position}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {employee.department}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">
                    SAR {employee.salary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(employee.contractStart).toLocaleDateString()} -{" "}
                      {new Date(employee.contractEnd).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-400"
                      >
                        <Edit className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteEmployee(employee.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
