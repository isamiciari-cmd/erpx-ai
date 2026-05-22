import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wand2,
  Plus,
  Settings,
  Database,
  Eye,
  Code,
  Trash2,
  GitBranch,
  Shield,
  Zap,
  Layout,
  FileCode,
} from "lucide-react";

interface Field {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "select" | "date" | "textarea" | "checkbox";
  options?: string[];
  required?: boolean;
  defaultValue?: any;
}

interface WorkflowRule {
  condition: string;
  action: string;
  value: any;
}

interface Module {
  id: number;
  name: string;
  description: string;
  icon: string;
  fields: Field[];
  permissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  workflows: WorkflowRule[];
}

interface DynamicRecord {
  id: number;
  moduleId: number;
  data: any;
  createdAt: string;
}

const studioAPI = {
  modules: [] as Module[],
  records: [] as DynamicRecord[],
  nextModuleId: 1,
  nextRecordId: 1,

  async createModule(module: Omit<Module, "id">): Promise<Module> {
    const newModule = { ...module, id: this.nextModuleId++ };
    this.modules.push(newModule);
    return new Promise((resolve) => setTimeout(() => resolve(newModule), 300));
  },

  async findAllModules(): Promise<Module[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.modules]), 300));
  },

  async deleteModule(id: number): Promise<void> {
    this.modules = this.modules.filter((m) => m.id !== id);
    this.records = this.records.filter((r) => r.moduleId !== id);
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },

  async createRecord(moduleId: number, data: any): Promise<DynamicRecord> {
    const record = {
      id: this.nextRecordId++,
      moduleId,
      data,
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return new Promise((resolve) => setTimeout(() => resolve(record), 300));
  },

  async findRecordsByModule(moduleId: number): Promise<DynamicRecord[]> {
    return new Promise((resolve) =>
      setTimeout(() => resolve(this.records.filter((r) => r.moduleId === moduleId)), 300)
    );
  },

  runWorkflow(data: any, rules: WorkflowRule[]): string {
    for (const rule of rules) {
      const { condition, action, value } = rule;

      if (condition.includes(">")) {
        const [field, threshold] = condition.split(">").map((s) => s.trim());
        if (data[field] > Number(threshold)) {
          return action;
        }
      } else if (condition.includes("=")) {
        const [field, expectedValue] = condition.split("=").map((s) => s.trim());
        if (data[field] === expectedValue) {
          return action;
        }
      }
    }
    return "pending";
  },
};

export default function StudioPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [moduleName, setModuleName] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleIcon, setModuleIcon] = useState("Box");
  const [fields, setFields] = useState<Field[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [permissions, setPermissions] = useState({
    create: true,
    read: true,
    update: true,
    delete: false,
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const fetchModules = async () => {
    const data = await studioAPI.findAllModules();
    setModules(data);
  };

  const addField = () => {
    setFields([
      ...fields,
      { name: "", label: "", type: "text", required: false },
    ]);
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const addWorkflow = () => {
    setWorkflows([
      ...workflows,
      { condition: "", action: "approved", value: null },
    ]);
  };

  const updateWorkflow = (index: number, updates: Partial<WorkflowRule>) => {
    const updated = [...workflows];
    updated[index] = { ...updated[index], ...updates };
    setWorkflows(updated);
  };

  const removeWorkflow = (index: number) => {
    setWorkflows(workflows.filter((_, i) => i !== index));
  };

  const generateModuleFromAI = async () => {
    setAiGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const prompt = aiPrompt.toLowerCase();

    if (prompt.includes("hr") || prompt.includes("موظف")) {
      setModuleName("HR Management");
      setModuleDescription("Employee management system");
      setFields([
        { name: "employeeName", label: "Employee Name", type: "text", required: true },
        { name: "position", label: "Position", type: "text", required: true },
        { name: "salary", label: "Salary", type: "number", required: true },
        { name: "hireDate", label: "Hire Date", type: "date", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Active", "On Leave", "Terminated"],
          required: true,
        },
      ]);
      setWorkflows([
        { condition: "salary > 15000", action: "require_approval", value: null },
      ]);
    } else if (prompt.includes("invoice") || prompt.includes("فاتورة")) {
      setModuleName("Invoice System");
      setModuleDescription("Dynamic invoice management");
      setFields([
        { name: "invoiceNumber", label: "Invoice Number", type: "text", required: true },
        { name: "customerName", label: "Customer Name", type: "text", required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Draft", "Sent", "Paid", "Overdue"],
          required: true,
        },
        { name: "dueDate", label: "Due Date", type: "date", required: true },
      ]);
      setWorkflows([
        { condition: "amount > 10000", action: "auto_approve", value: null },
      ]);
    } else if (prompt.includes("ticket") || prompt.includes("support")) {
      setModuleName("Support Tickets");
      setModuleDescription("Customer support ticket system");
      setFields([
        { name: "ticketId", label: "Ticket ID", type: "text", required: true },
        { name: "subject", label: "Subject", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        {
          name: "priority",
          label: "Priority",
          type: "select",
          options: ["Low", "Medium", "High", "Urgent"],
          required: true,
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Open", "In Progress", "Resolved", "Closed"],
          required: true,
        },
      ]);
      setWorkflows([
        { condition: "priority = Urgent", action: "notify_team", value: null },
      ]);
    } else {
      setModuleName("Custom Module");
      setModuleDescription("Generated from your request");
      setFields([
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: false },
      ]);
    }

    setAiGenerating(false);
    setAiPrompt("");
  };

  const createModule = async () => {
    if (!moduleName || fields.length === 0) {
      alert("Please provide module name and at least one field");
      return;
    }

    await studioAPI.createModule({
      name: moduleName,
      description: moduleDescription,
      icon: moduleIcon,
      fields,
      permissions,
      workflows,
    });

    setModuleName("");
    setModuleDescription("");
    setFields([]);
    setWorkflows([]);
    setShowBuilder(false);
    fetchModules();
  };

  const deleteModule = async (id: number) => {
    if (confirm("Delete this module and all its data?")) {
      await studioAPI.deleteModule(id);
      fetchModules();
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-purple-400" />
            ERPX Studio
          </h1>
          <p className="text-gray-400 mt-2">Build custom modules without code</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowBuilder(!showBuilder)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Module
        </motion.button>
      </div>

      {/* AI Assistant */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">AI Module Generator</h3>
            <p className="text-sm text-gray-400 mb-4">
              Describe what you want to build and AI will create the module for you
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. أريد نظام HR / I need invoice system / Support ticket system"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === "Enter" && generateModuleFromAI()}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateModuleFromAI}
                disabled={aiGenerating || !aiPrompt}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {aiGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Module Builder */}
      <AnimatePresence>
        {showBuilder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Module Builder</h2>

              {/* Basic Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Module Name</label>
                    <input
                      type="text"
                      value={moduleName}
                      onChange={(e) => setModuleName(e.target.value)}
                      placeholder="HR Management"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <input
                      type="text"
                      value={moduleDescription}
                      onChange={(e) => setModuleDescription(e.target.value)}
                      placeholder="Employee management system"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Fields Designer */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Field Designer
                  </h3>
                  <button
                    onClick={addField}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(i, { name: e.target.value })}
                          placeholder="Field Name (e.g. employeeName)"
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          placeholder="Label (e.g. Employee Name)"
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(i, {
                              type: e.target.value as Field["type"],
                            })
                          }
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="email">Email</option>
                          <option value="date">Date</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-sm text-gray-400">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(i, { required: e.target.checked })}
                              className="rounded"
                            />
                            Required
                          </label>
                          <button
                            onClick={() => removeField(i)}
                            className="ml-auto p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {field.type === "select" && (
                        <input
                          type="text"
                          value={field.options?.join(", ") || ""}
                          onChange={(e) =>
                            updateField(i, {
                              options: e.target.value.split(",").map((s) => s.trim()),
                            })
                          }
                          placeholder="Options (comma separated): Active, Inactive, Pending"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Workflow Rules */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Workflow Rules
                  </h3>
                  <button
                    onClick={addWorkflow}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                  >
                    + Add Rule
                  </button>
                </div>

                <div className="space-y-3">
                  {workflows.map((workflow, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={workflow.condition}
                          onChange={(e) => updateWorkflow(i, { condition: e.target.value })}
                          placeholder="Condition (e.g. salary > 15000)"
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <select
                          value={workflow.action}
                          onChange={(e) => updateWorkflow(i, { action: e.target.value })}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="auto_approve">Auto Approve</option>
                          <option value="require_approval">Require Approval</option>
                          <option value="notify_team">Notify Team</option>
                          <option value="send_email">Send Email</option>
                        </select>
                        <button
                          onClick={() => removeWorkflow(i)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Permissions
                </h3>
                <div className="flex gap-6">
                  {Object.entries(permissions).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-400">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setPermissions({ ...permissions, [key]: e.target.checked })
                        }
                        className="rounded"
                      />
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createModule}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
                >
                  Create Module
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBuilder(false)}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, i) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSelectedModule(module);
                    setShowPreview(true);
                  }}
                  className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400"
                >
                  <Eye className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteModule(module.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">{module.name}</h3>
            <p className="text-sm text-gray-400 mb-4">{module.description}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <FileCode className="w-3 h-3" />
                {module.fields.length} Fields
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <GitBranch className="w-3 h-3" />
                {module.workflows.length} Workflows
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield className="w-3 h-3" />
                Permissions: {Object.values(module.permissions).filter(Boolean).length}/4
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedModule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 rounded-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedModule.name}</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-400 mb-6">{selectedModule.description}</p>

              <div className="space-y-4">
                {selectedModule.fields.map((field, i) => (
                  <div key={i}>
                    <label className="block text-sm text-gray-400 mb-2">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>

                    {field.type === "text" && (
                      <input
                        type="text"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    )}

                    {field.type === "number" && (
                      <input
                        type="number"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    )}

                    {field.type === "email" && (
                      <input
                        type="email"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    )}

                    {field.type === "date" && (
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    )}

                    {field.type === "textarea" && (
                      <textarea
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        rows={4}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    )}

                    {field.type === "select" && (
                      <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">Select {field.label.toLowerCase()}</option>
                        {field.options?.map((opt, j) => (
                          <option key={j} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === "checkbox" && (
                      <label className="flex items-center gap-2 text-white">
                        <input type="checkbox" className="rounded" />
                        {field.label}
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
                >
                  Submit
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
