import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2, Database, Shield, RefreshCw, WifiOff, Wifi } from "lucide-react";
import { supabase, isDemoMode } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import * as customersService from "../../services/customersService";
import * as productsService from "../../services/productsService";

type TestStatus = "idle" | "running" | "pass" | "fail" | "warn";

interface LogEntry {
  ts: string;
  level: "info" | "success" | "error" | "warn";
  msg: string;
}

interface TestResult {
  id: string;
  label: string;
  status: TestStatus;
  detail: string;
  logs: LogEntry[];
}

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

function log(entries: LogEntry[], level: LogEntry["level"], msg: string): LogEntry[] {
  return [...entries, { ts: now(), level, msg }];
}

const INITIAL_TESTS: TestResult[] = [
  {
    id: "connection",
    label: "1 · Connection Test — Supabase Client Initialization",
    status: "idle",
    detail: "Pending",
    logs: [],
  },
  {
    id: "auth",
    label: "2 · Authentication Test — Session Check",
    status: "idle",
    detail: "Pending",
    logs: [],
  },
  {
    id: "read",
    label: "3 · Read Test — Query customers table",
    status: "idle",
    detail: "Pending",
    logs: [],
  },
  {
    id: "create",
    label: "4 · Create Test — Insert test record",
    status: "idle",
    detail: "Pending",
    logs: [],
  },
  {
    id: "update",
    label: "5 · Update Test — Modify test record",
    status: "idle",
    detail: "Pending",
    logs: [],
  },
  {
    id: "delete",
    label: "6 · Delete Test — Remove test record",
    status: "idle",
    detail: "Pending",
    logs: [],
  },
];

export default function SupabaseDiagnosticPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestResult[]>(INITIAL_TESTS);
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<"idle" | "connected" | "failed" | "demo">("idle");

  const patch = (id: string, update: Partial<Omit<TestResult, "id" | "label">>) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...update } : t)));
  };

  // Test 1: Connection
  const runConnectionTest = async (): Promise<boolean> => {
    let logs: LogEntry[] = [];
    patch("connection", { status: "running", detail: "Testing connection...", logs });

    logs = log(logs, "info", `isDemoMode = ${isDemoMode}`);
    logs = log(logs, "info", `Supabase URL = ${import.meta.env.VITE_SUPABASE_URL || "not set"}`);

    if (isDemoMode) {
      logs = log(logs, "warn", "DEMO MODE active — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.");
      patch("connection", {
        status: "warn",
        detail: "DEMO MODE — Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real DB access.",
        logs,
      });
      return false;
    }

    try {
      logs = log(logs, "info", "Testing Supabase connection...");
      const { data, error } = await supabase.from('customers').select('count').limit(0);

      if (error) {
        logs = log(logs, "error", `Connection failed: ${error.message}`);
        patch("connection", {
          status: "fail",
          detail: `Connection failed: ${error.message}`,
          logs,
        });
        return false;
      }

      logs = log(logs, "success", "Connected to Supabase successfully");
      patch("connection", {
        status: "pass",
        detail: "Connected to Supabase PostgreSQL database successfully",
        logs,
      });
      return true;
    } catch (err: any) {
      logs = log(logs, "error", `Connection test threw: ${err?.message || String(err)}`);
      patch("connection", {
        status: "fail",
        detail: `Connection failed: ${err?.message || String(err)}`,
        logs,
      });
      return false;
    }
  };

  // Test 2: Auth
  const runAuthTest = async (): Promise<boolean> => {
    let logs: LogEntry[] = [];
    patch("auth", { status: "running", detail: "Checking auth...", logs });

    if (isDemoMode) {
      logs = log(logs, "warn", "Skipped — demo mode active");
      patch("auth", {
        status: "warn",
        detail: "Skipped (demo mode)",
        logs,
      });
      return false;
    }

    try {
      logs = log(logs, "info", "Checking Supabase auth session...");
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logs = log(logs, "error", `Auth check failed: ${error.message}`);
        patch("auth", {
          status: "fail",
          detail: `Auth check failed: ${error.message}`,
          logs,
        });
        return false;
      }

      if (session) {
        logs = log(logs, "success", `Auth session found for user: ${session.user.email}`);
        patch("auth", {
          status: "pass",
          detail: `Authenticated as ${session.user.email}`,
          logs,
        });
        return true;
      } else {
        logs = log(logs, "warn", "No active session found");
        patch("auth", {
          status: "warn",
          detail: "No active session (not logged in)",
          logs,
        });
        return false;
      }
    } catch (err: any) {
      logs = log(logs, "error", `Auth test failed: ${err?.message || String(err)}`);
      patch("auth", {
        status: "fail",
        detail: `Auth test failed: ${err?.message || String(err)}`,
        logs,
      });
      return false;
    }
  };

  // Test 3: Read
  const runReadTest = async (): Promise<boolean> => {
    let logs: LogEntry[] = [];
    patch("read", { status: "running", detail: "Reading data...", logs });

    if (isDemoMode) {
      logs = log(logs, "warn", "Skipped — demo mode active");
      patch("read", {
        status: "warn",
        detail: "Skipped (demo mode)",
        logs,
      });
      return false;
    }

    try {
      logs = log(logs, "info", "Query: SELECT * FROM customers LIMIT 5");
      const customers = await customersService.listCustomers(user?.company_id || "");

      logs = log(logs, "success", `Query returned ${customers.length} records`);
      patch("read", {
        status: "pass",
        detail: `Successfully read ${customers.length} customer records from Supabase`,
        logs,
      });
      return true;
    } catch (err: any) {
      logs = log(logs, "error", `Read test failed: ${err?.message || String(err)}`);
      patch("read", {
        status: "fail",
        detail: `Read test failed: ${err?.message || String(err)}`,
        logs,
      });
      return false;
    }
  };

  // Test 4: Create
  const runCreateTest = async (): Promise<boolean> => {
    let logs: LogEntry[] = [];
    patch("create", { status: "running", detail: "Creating record...", logs });

    if (isDemoMode) {
      logs = log(logs, "warn", "Skipped — demo mode active");
      patch("create", {
        status: "warn",
        detail: "Skipped (demo mode)",
        logs,
      });
      return false;
    }

    try {
      logs = log(logs, "info", "INSERT INTO products (test record)");
      const testProduct = await productsService.createProduct({
        company_id: user?.company_id || "",
        category_id: "test-category",
        sku: `TEST-${Date.now()}`,
        product_name: "Supabase Test Product",
        unit_price: 99.99,
        cost_price: 50.00,
        vat_rate: 15,
        min_stock_level: 10,
        is_active: true,
      });

      logs = log(logs, "success", `Product created with ID: ${testProduct.id}`);
      patch("create", {
        status: "pass",
        detail: `Successfully created test product (ID: ${testProduct.id})`,
        logs,
      });

      // Store ID for next tests
      (window as any).__testProductId = testProduct.id;
      return true;
    } catch (err: any) {
      logs = log(logs, "error", `Create test failed: ${err?.message || String(err)}`);
      patch("create", {
        status: "fail",
        detail: `Create test failed: ${err?.message || String(err)}`,
        logs,
      });
      return false;
    }
  };

  // Test 5: Update
  const runUpdateTest = async (): Promise<boolean> => {
    let logs: LogEntry[] = [];
    patch("update", { status: "running", detail: "Updating record...", logs });

    if (isDemoMode) {
      logs = log(logs, "warn", "Skipped — demo mode active");
      patch("update", {
        status: "warn",
        detail: "Skipped (demo mode)",
        logs,
      });
      return false;
    }

    const testId = (window as any).__testProductId;
    if (!testId) {
      logs = log(logs, "error", "No test record ID found (create test may have failed)");
      patch("update", {
        status: "fail",
        detail: "No test record to update",
        logs,
      });
      return false;
    }

    try {
      logs = log(logs, "info", `UPDATE products SET unit_price = 149.99 WHERE id = ${testId}`);
      await productsService.updateProduct(testId, { unit_price: 149.99 });

      logs = log(logs, "success", "Product updated successfully");
      patch("update", {
        status: "pass",
        detail: "Successfully updated test product",
        logs,
      });
      return true;
    } catch (err: any) {
      logs = log(logs, "error", `Update test failed: ${err?.message || String(err)}`);
      patch("update", {
        status: "fail",
        detail: `Update test failed: ${err?.message || String(err)}`,
        logs,
      });
      return false;
    }
  };

  // Test 6: Delete
  const runDeleteTest = async (): Promise<boolean> => {
    let logs: LogEntry[] = [];
    patch("delete", { status: "running", detail: "Deleting record...", logs });

    if (isDemoMode) {
      logs = log(logs, "warn", "Skipped — demo mode active");
      patch("delete", {
        status: "warn",
        detail: "Skipped (demo mode)",
        logs,
      });
      return false;
    }

    const testId = (window as any).__testProductId;
    if (!testId) {
      logs = log(logs, "error", "No test record ID found");
      patch("delete", {
        status: "fail",
        detail: "No test record to delete",
        logs,
      });
      return false;
    }

    try {
      logs = log(logs, "info", `DELETE FROM products WHERE id = ${testId}`);
      await productsService.deleteProduct(testId);

      logs = log(logs, "success", "Product deleted successfully");
      patch("delete", {
        status: "pass",
        detail: "Successfully deleted test product",
        logs,
      });
      delete (window as any).__testProductId;
      return true;
    } catch (err: any) {
      logs = log(logs, "error", `Delete test failed: ${err?.message || String(err)}`);
      patch("delete", {
        status: "fail",
        detail: `Delete test failed: ${err?.message || String(err)}`,
        logs,
      });
      return false;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setRunning(true);
    setVerdict("idle");
    setTests(INITIAL_TESTS);

    const results: boolean[] = [];
    results.push(await runConnectionTest());
    results.push(await runAuthTest());
    results.push(await runReadTest());
    results.push(await runCreateTest());
    results.push(await runUpdateTest());
    results.push(await runDeleteTest());

    const failed = results.filter((r) => r === false).length;

    if (isDemoMode) {
      setVerdict("demo");
    } else if (failed === 0) {
      setVerdict("connected");
    } else {
      setVerdict("failed");
    }

    setRunning(false);
  };

  const statusIcon = (s: TestStatus) => {
    if (s === "pass") return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (s === "fail") return <XCircle className="w-5 h-5 text-red-400" />;
    if (s === "warn") return <AlertCircle className="w-5 h-5 text-amber-400" />;
    if (s === "running") return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
    return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
  };

  const statusBg = (s: TestStatus) => {
    if (s === "pass") return "border-emerald-500/40 bg-emerald-900/10";
    if (s === "fail") return "border-red-500/40 bg-red-900/10";
    if (s === "warn") return "border-amber-500/40 bg-amber-900/10";
    if (s === "running") return "border-blue-500/40 bg-blue-900/10";
    return "border-gray-700/50 bg-gray-800/30";
  };

  const logColor = (l: LogEntry["level"]) => {
    if (l === "success") return "text-emerald-400";
    if (l === "error") return "text-red-400";
    if (l === "warn") return "text-amber-400";
    return "text-gray-400";
  };

  const verdictBanner = () => {
    if (verdict === "connected")
      return (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-900/20 px-6 py-4">
          <Wifi className="w-7 h-7 text-emerald-400" />
          <div>
            <p className="text-emerald-300 font-mono text-lg font-bold">✅ CONNECTED SUCCESSFULLY</p>
            <p className="text-emerald-400/70 text-sm">All tests passed. ERPX-AI is fully connected to Supabase PostgreSQL.</p>
          </div>
        </div>
      );

    if (verdict === "demo")
      return (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-900/20 px-6 py-4">
          <AlertCircle className="w-7 h-7 text-amber-400" />
          <div>
            <p className="text-amber-300 font-mono text-lg font-bold">⚠ DEMO MODE — NOT CONNECTED</p>
            <p className="text-amber-400/70 text-sm">
              Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect to Supabase.
            </p>
          </div>
        </div>
      );

    if (verdict === "failed")
      return (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-900/20 px-6 py-4">
          <WifiOff className="w-7 h-7 text-red-400" />
          <div>
            <p className="text-red-300 font-mono text-lg font-bold">❌ CONNECTION FAILED</p>
            <p className="text-red-400/70 text-sm">One or more tests failed. Review logs below.</p>
          </div>
        </div>
      );

    return null;
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Database className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Supabase Diagnostic</h1>
            <p className="text-gray-400 text-sm">ERPX-AI · PostgreSQL Connection Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isDemoMode
                ? "bg-amber-900/30 border-amber-500/40 text-amber-300"
                : "bg-emerald-900/30 border-emerald-500/40 text-emerald-300"
            }`}
          >
            {isDemoMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {isDemoMode ? "DEMO MODE" : "PRODUCTION MODE"}
          </span>
        </div>
      </div>

      {verdict !== "idle" && <div className="mb-6">{verdictBanner()}</div>}

      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {running ? "Running Tests…" : "Run All Diagnostic Tests"}
        </button>
      </div>

      <div className="space-y-4">
        {tests.map((test) => (
          <div key={test.id} className={`rounded-xl border p-4 transition-all ${statusBg(test.status)}`}>
            <div className="flex items-start gap-3">
              {statusIcon(test.status)}
              <div className="flex-1">
                <p className="font-medium text-white text-sm">{test.label}</p>
                <p className={`text-xs mt-0.5 ${
                  test.status === "pass" ? "text-emerald-400" :
                  test.status === "fail" ? "text-red-400" :
                  test.status === "warn" ? "text-amber-400" : "text-gray-400"
                }`}>
                  {test.detail}
                </p>
              </div>
            </div>

            {test.logs.length > 0 && (
              <div className="mt-3 bg-black/40 rounded-lg p-3 font-mono text-xs space-y-0.5 max-h-48 overflow-y-auto">
                {test.logs.map((entry, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-600 shrink-0">{entry.ts.slice(11)}</span>
                    <span className={logColor(entry.level)}>{entry.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-300">Environment Variables Required</h2>
        </div>
        <pre className="bg-black/50 rounded-lg p-4 text-xs font-mono text-green-400 overflow-x-auto">
{`# .env (project root)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
        </pre>
      </div>
    </div>
  );
}
