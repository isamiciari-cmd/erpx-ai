import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ui/Toast";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "../contexts/AuthContext";
import "../i18n/config";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProductionLogin from "./components/ProductionLogin";
import ProtectedRoute from "../components/ProtectedRoute";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MainLayout from "./layout/MainLayout";
import CashierLayout from "./layout/CashierLayout";
import AuthenticationDocsPage from "./pages/AuthenticationDocsPage";
import DashboardPage from "./pages/DashboardPage";
import FinancePage from "./pages/FinancePage";
import InvoicingPage from "./pages/InvoicingPage";
import ChartOfAccountsPage from "./pages/ChartOfAccountsPage";
import CurrencyPage from "./pages/CurrencyPage";
import ZATCAPage from "./pages/ZATCAPage";
import TenantManagementPage from "./pages/TenantManagementPage";
import EmployeesPage from "./pages/EmployeesPage";
import POSPage from "./pages/POSPage";
import InventoryPage from "./pages/InventoryPage";
import InventoryManagementPage from "./pages/inventory/InventoryManagementPage";
import StudioPage from "./pages/StudioPage";
import SaaSMetricsPage from "./pages/SaaSMetricsPage";
import WebhookSimulatorPage from "./pages/WebhookSimulatorPage";
import UsageTrackingPage from "./pages/UsageTrackingPage";
import ControlTowerPage from "./pages/ControlTowerPage";
import AutomationRulesPage from "./pages/AutomationRulesPage";
import PermissionsPage from "./pages/PermissionsPage";
import SupabaseDiagnosticPage from "./pages/SupabaseDiagnosticPage";
import CompanyRegistrationForm from "./components/registration/CompanyRegistrationForm";
import RegistrationSuccessPage from "./pages/RegistrationSuccessPage";
import OAuthConsentPage from "./pages/OAuthConsentPage";
import SalesPage from "./pages/SalesPage";
import PurchasesPage from "./pages/PurchasesPage";
import GenericPage from "./pages/GenericPage";

// Finance Module Pages
import FinanceDashboardPage from "./pages/finance/FinanceDashboardPage";
import JournalEntriesPage from "./pages/finance/JournalEntriesPage";
import GeneralLedgerPage from "./pages/finance/GeneralLedgerPage";
import TrialBalancePage from "./pages/finance/TrialBalancePage";
import AccountsReceivablePage from "./pages/finance/AccountsReceivablePage";
import AccountsPayablePage from "./pages/finance/AccountsPayablePage";
import CashBankManagementPage from "./pages/finance/CashBankManagementPage";
import BudgetManagementPage from "./pages/finance/BudgetManagementPage";
import ExpenseManagementPage from "./pages/finance/ExpenseManagementPage";
import FixedAssetsPage from "./pages/finance/FixedAssetsPage";
import VATTaxPage from "./pages/finance/VATTaxPage";
import FinancialReportsPage from "./pages/finance/FinancialReportsPage";
import AIFinanceAssistantPage from "./pages/finance/AIFinanceAssistantPage";

// Design System & Food Delivery
import DesignSystemShowcase from "./pages/DesignSystemShowcase";
import FoodDeliveryDashboard from "./pages/FoodDeliveryDashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";

// Landing Page
import LandingPage from "./pages/LandingPage";

// HR Module Pages
import HRDashboardPage from "./pages/hr/HRDashboardPage";
import EmployeeListPage from "./pages/hr/EmployeeListPage";
import AttendancePage from "./pages/hr/AttendancePage";
import LeaveManagementPage from "./pages/hr/LeaveManagementPage";
import PayrollPage from "./pages/hr/PayrollPage";
import RecruitmentPage from "./pages/hr/RecruitmentPage";
import HRReportsPage from "./pages/hr/HRReportsPage";
import AIHRAssistantPage from "./pages/hr/AIHRAssistantPage";

// Cashier Module Pages
import CashierPOSPage from "./pages/cashier/CashierPOSPage";

// RBAC Admin Pages
import {
  UserManagement,
  RolesPermissions,
  PermissionMatrix,
  AuditLogs,
  DeveloperMode,
  EmergencyAccess
} from "../pages/admin";


export default function App() {
  const adminRoles = ["owner", "developer", "super_admin", "admin"];

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes - No Authentication Required */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<CompanyRegistrationForm />} />
                <Route path="/registration-success" element={<RegistrationSuccessPage />} />
                <Route path="/login" element={<ProductionLogin />} />
                <Route path="/oauth/consent" element={<OAuthConsentPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/admin/supabase-diagnostic" element={<ProtectedRoute requiredRoles={adminRoles}><SupabaseDiagnosticPage /></ProtectedRoute>} />

                {/* Cashier Routes - Separate Layout (nested) */}
                <Route path="/cashier/*" element={<ProtectedRoute requiredRole="cashier"><CashierLayout /></ProtectedRoute>}>
                  <Route path="pos" element={<CashierPOSPage />} />
                  <Route path="*" element={<Navigate to="pos" replace />} />
                </Route>

                {/* Authenticated Routes (nested under MainLayout) */}
                <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route index element={<ExecutiveDashboard />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  {/* Finance */}
                  <Route path="finance/dashboard" element={<FinanceDashboardPage />} />
                  <Route path="finance/journal-entries" element={<JournalEntriesPage />} />
                  <Route path="finance/general-ledger" element={<GeneralLedgerPage />} />
                  <Route path="finance/trial-balance" element={<TrialBalancePage />} />
                  <Route path="finance/accounts-receivable" element={<AccountsReceivablePage />} />
                  <Route path="finance/accounts-payable" element={<AccountsPayablePage />} />
                  <Route path="finance/cash-bank" element={<CashBankManagementPage />} />
                  <Route path="finance/budgets" element={<BudgetManagementPage />} />
                  <Route path="finance/expenses" element={<ExpenseManagementPage />} />
                  <Route path="finance/fixed-assets" element={<FixedAssetsPage />} />
                  <Route path="finance/vat-tax" element={<VATTaxPage />} />
                  <Route path="finance/reports" element={<FinancialReportsPage />} />
                  <Route path="finance/ai-assistant" element={<AIFinanceAssistantPage />} />
                  <Route path="finance/accounting" element={<ChartOfAccountsPage />} />
                  <Route path="finance/invoicing" element={<InvoicingPage />} />
                  <Route path="finance/currency" element={<CurrencyPage />} />
                  <Route path="finance/zatca" element={<ZATCAPage />} />

                  {/* Sales & CRM */}
                  <Route path="crm" element={<GenericPage title="CRM" description="Customer Relationship Management" />} />
                  <Route path="sales" element={<SalesPage />} />
                  <Route path="pos" element={<POSPage />} />
                  <Route path="subscriptions" element={<GenericPage title="Subscriptions" description="Recurring billing and subscriptions" />} />

                  {/* Operations */}
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/manage" element={<InventoryManagementPage />} />
                  <Route path="purchase" element={<PurchasesPage />} />
                  <Route path="mrp" element={<GenericPage title="MRP" description="Material Requirements Planning" />} />
                  <Route path="plm" element={<GenericPage title="PLM" description="Product Lifecycle Management" />} />

                  {/* HR */}
                  <Route path="hr/dashboard" element={<HRDashboardPage />} />
                  <Route path="hr/employees" element={<EmployeeListPage />} />
                  <Route path="hr/attendance" element={<AttendancePage />} />
                  <Route path="hr/leaves" element={<LeaveManagementPage />} />
                  <Route path="hr/payroll" element={<PayrollPage />} />
                  <Route path="hr/recruitment" element={<RecruitmentPage />} />
                  <Route path="hr/reports" element={<HRReportsPage />} />
                  <Route path="hr/ai-assistant" element={<AIHRAssistantPage />} />

                  {/* Projects */}
                  <Route path="projects" element={<GenericPage title="Projects" description="Project management and tracking" />} />
                  <Route path="timesheets" element={<GenericPage title="Timesheets" description="Time logging and billing" />} />
                  <Route path="field-service" element={<GenericPage title="Field Service" description="On-site service management" />} />
                  <Route path="helpdesk" element={<GenericPage title="Helpdesk" description="Support tickets and customer service" />} />

                  {/* Design System & Demo Pages */}
                  <Route path="design-system" element={<DesignSystemShowcase />} />
                  <Route path="food-delivery" element={<FoodDeliveryDashboard />} />
                  <Route path="executive" element={<ExecutiveDashboard />} />

                  {/* AI Center */}
                  <Route path="ai/predictions" element={<GenericPage title="AI Predictions" description="AI-powered forecasting and predictive analytics" />} />
                  <Route path="ai/recommendations" element={<GenericPage title="AI Recommendations" description="Intelligent recommendations and insights" />} />
                  <Route path="ai/alerts" element={<GenericPage title="AI Alerts" description="Smart alerts and anomaly detection" />} />

                  {/* System */}
                  <Route path="system/users" element={<GenericPage title="Users" description="User management and access control" />} />
                  <Route path="system/permissions" element={<PermissionsPage />} />

                  {/* Admin */}
                  <Route path="admin/control-tower" element={<ProtectedRoute requiredRoles={adminRoles}><ControlTowerPage /></ProtectedRoute>} />
                  <Route path="admin/tenants" element={<ProtectedRoute requiredRoles={adminRoles}><TenantManagementPage /></ProtectedRoute>} />
                  <Route path="admin/studio" element={<ProtectedRoute requiredRoles={adminRoles}><StudioPage /></ProtectedRoute>} />
                  <Route path="admin/metrics" element={<ProtectedRoute requiredRoles={adminRoles}><SaaSMetricsPage /></ProtectedRoute>} />
                  <Route path="admin/usage" element={<ProtectedRoute requiredRoles={adminRoles}><UsageTrackingPage /></ProtectedRoute>} />
                  <Route path="admin/automation" element={<ProtectedRoute requiredRoles={adminRoles}><AutomationRulesPage /></ProtectedRoute>} />
                  <Route path="admin/webhooks" element={<ProtectedRoute requiredRoles={adminRoles}><WebhookSimulatorPage /></ProtectedRoute>} />
                  <Route path="admin/auth-docs" element={<ProtectedRoute requiredRoles={adminRoles}><AuthenticationDocsPage /></ProtectedRoute>} />

                  {/* RBAC Admin Pages */}
                  <Route path="admin/users" element={<ProtectedRoute requiredRoles={adminRoles}><UserManagement /></ProtectedRoute>} />
                  <Route path="admin/roles" element={<ProtectedRoute requiredRoles={adminRoles}><RolesPermissions /></ProtectedRoute>} />
                  <Route path="admin/permissions-matrix" element={<ProtectedRoute requiredRoles={adminRoles}><PermissionMatrix /></ProtectedRoute>} />
                  <Route path="admin/audit-logs" element={<ProtectedRoute requiredRoles={adminRoles}><AuditLogs /></ProtectedRoute>} />
                  <Route path="admin/developer-mode" element={<ProtectedRoute requiredRoles={["owner", "developer"]}><DeveloperMode /></ProtectedRoute>} />
                  <Route path="admin/emergency-access" element={<ProtectedRoute requiredRoles={["owner"]}><EmergencyAccess /></ProtectedRoute>} />

                  <Route path="settings" element={<GenericPage title="Settings" description="System configuration and preferences" />} />
                </Route>

                {/* Redirect unknown to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}