import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import '../i18n/config';
import { ErrorBoundary } from './components/ErrorBoundary';
const ProductionLogin = lazy(() => import('./components/ProductionLogin'));
import ProtectedRoute from '../components/ProtectedRoute';
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
import MainLayout from './layout/MainLayout';
import CashierLayout from './layout/CashierLayout';
const AuthenticationDocsPage = lazy(() => import('./pages/AuthenticationDocsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InvoicingPage = lazy(() => import('./pages/InvoicingPage'));
const ChartOfAccountsPage = lazy(() => import('./pages/ChartOfAccountsPage'));
const CurrencyPage = lazy(() => import('./pages/CurrencyPage'));
const ZATCAPage = lazy(() => import('./pages/ZATCAPage'));
const TenantManagementPage = lazy(() => import('./pages/TenantManagementPage'));
const POSPage = lazy(() => import('./pages/POSPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const InventoryManagementPage = lazy(() => import('./pages/inventory/InventoryManagementPage'));
const StudioPage = lazy(() => import('./pages/StudioPage'));
const SaaSMetricsPage = lazy(() => import('./pages/SaaSMetricsPage'));
const WebhookSimulatorPage = lazy(() => import('./pages/WebhookSimulatorPage'));
const UsageTrackingPage = lazy(() => import('./pages/UsageTrackingPage'));
const ControlTowerPage = lazy(() => import('./pages/ControlTowerPage'));
const AutomationRulesPage = lazy(() => import('./pages/AutomationRulesPage'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'));
const SupabaseDiagnosticPage = lazy(() => import('./pages/SupabaseDiagnosticPage'));
const CompanyRegistrationForm = lazy(() => import('./components/registration/CompanyRegistrationForm'));
const RegistrationSuccessPage = lazy(() => import('./pages/RegistrationSuccessPage'));
const OAuthConsentPage = lazy(() => import('./pages/OAuthConsentPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const GenericPage = lazy(() => import('./pages/GenericPage'));

// Finance Module Pages
const FinanceDashboardPage = lazy(() => import('./pages/finance/FinanceDashboardPage'));
const JournalEntriesPage = lazy(() => import('./pages/finance/JournalEntriesPage'));
const GeneralLedgerPage = lazy(() => import('./pages/finance/GeneralLedgerPage'));
const TrialBalancePage = lazy(() => import('./pages/finance/TrialBalancePage'));
const AccountsReceivablePage = lazy(() => import('./pages/finance/AccountsReceivablePage'));
const AccountsPayablePage = lazy(() => import('./pages/finance/AccountsPayablePage'));
const CashBankManagementPage = lazy(() => import('./pages/finance/CashBankManagementPage'));
const BudgetManagementPage = lazy(() => import('./pages/finance/BudgetManagementPage'));
const ExpenseManagementPage = lazy(() => import('./pages/finance/ExpenseManagementPage'));
const FixedAssetsPage = lazy(() => import('./pages/finance/FixedAssetsPage'));
const VATTaxPage = lazy(() => import('./pages/finance/VATTaxPage'));
const FinancialReportsPage = lazy(() => import('./pages/finance/FinancialReportsPage'));
const AIFinanceAssistantPage = lazy(() => import('./pages/finance/AIFinanceAssistantPage'));

// Design System & Food Delivery
const DesignSystemShowcase = lazy(() => import('./pages/DesignSystemShowcase'));
const FoodDeliveryDashboard = lazy(() => import('./pages/FoodDeliveryDashboard'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));

// Landing Page
const LandingPage = lazy(() => import('./pages/LandingPage'));

// HR Module Pages
const HRDashboardPage = lazy(() => import('./pages/hr/HRDashboardPage'));
const EmployeeListPage = lazy(() => import('./pages/hr/EmployeeListPage'));
const AttendancePage = lazy(() => import('./pages/hr/AttendancePage'));
const LeaveManagementPage = lazy(() => import('./pages/hr/LeaveManagementPage'));
const PayrollPage = lazy(() => import('./pages/hr/PayrollPage'));
const RecruitmentPage = lazy(() => import('./pages/hr/RecruitmentPage'));
const HRReportsPage = lazy(() => import('./pages/hr/HRReportsPage'));
const AIHRAssistantPage = lazy(() => import('./pages/hr/AIHRAssistantPage'));

// Cashier Module Pages
const CashierPOSPage = lazy(() => import('./pages/cashier/CashierPOSPage'));

// RBAC Admin Pages
const UserManagement = lazy(() => import('../pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const RolesPermissions = lazy(() => import('../pages/admin/RolesPermissions').then(m => ({ default: m.RolesPermissions })));
const PermissionMatrix = lazy(() => import('../pages/admin/PermissionMatrix').then(m => ({ default: m.PermissionMatrix })));
const AuditLogs = lazy(() => import('../pages/admin/AuditLogs').then(m => ({ default: m.AuditLogs })));
const DeveloperMode = lazy(() => import('../pages/admin/DeveloperMode').then(m => ({ default: m.DeveloperMode })));
const EmergencyAccess = lazy(() => import('../pages/admin/EmergencyAccess').then(m => ({ default: m.EmergencyAccess })));

const EnergyPage = lazy(() => import('./pages/bms/EnergyPage'));
const CCTVLivePage = lazy(() => import('./pages/bms/CCTVLivePage'));
const AIWorkspacePage = lazy(() => import('./pages/AIWorkspacePage'));

export default function App() {
  const adminRoles = ['owner', 'developer', 'super_admin', 'admin'];

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<div role="status" className="p-8">Loading page?</div>}>
              <Routes>
                {/* Public Routes - No Authentication Required */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<CompanyRegistrationForm />} />
                <Route path="/registration-success" element={<RegistrationSuccessPage />} />
                <Route path="/login" element={<ProductionLogin />} />
                <Route path="/oauth/consent" element={<OAuthConsentPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  path="/admin/supabase-diagnostic"
                  element={
                    <ProtectedRoute requiredRole={adminRoles}>
                      <SupabaseDiagnosticPage />
                    </ProtectedRoute>
                  }
                />

                {/* Cashier Routes - Separate Layout (nested) */}
                <Route
                  path="/cashier/*"
                  element={
                    <ProtectedRoute requiredRole="cashier">
                      <CashierLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="pos" element={<CashierPOSPage />} />
                  <Route path="*" element={<Navigate to="pos" replace />} />
                </Route>

                {/* Authenticated Routes (nested under MainLayout) */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
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
                  <Route path="reports" element={<FinancialReportsPage />} />
                  <Route path="finance/invoicing" element={<InvoicingPage />} />
                  <Route path="finance/currency" element={<CurrencyPage />} />
                  <Route path="finance/zatca" element={<ZATCAPage />} />

                  {/* Sales & CRM */}
                  <Route
                    path="crm"
                    element={
                      <GenericPage title="CRM" description="Customer Relationship Management" />
                    }
                  />
                  <Route path="sales" element={<SalesPage />} />
                  <Route path="pos" element={<POSPage />} />
                  <Route
                    path="subscriptions"
                    element={
                      <GenericPage
                        title="Subscriptions"
                        description="Recurring billing and subscriptions"
                      />
                    }
                  />

                  {/* Operations */}
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/manage" element={<InventoryManagementPage />} />
                  <Route path="purchase" element={<PurchasesPage />} />
                  <Route
                    path="mrp"
                    element={
                      <GenericPage title="MRP" description="Material Requirements Planning" />
                    }
                  />
                  <Route
                    path="plm"
                    element={<GenericPage title="PLM" description="Product Lifecycle Management" />}
                  />

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
                  <Route
                    path="projects"
                    element={
                      <GenericPage title="Projects" description="Project management and tracking" />
                    }
                  />
                  <Route
                    path="timesheets"
                    element={
                      <GenericPage title="Timesheets" description="Time logging and billing" />
                    }
                  />
                  <Route
                    path="field-service"
                    element={
                      <GenericPage title="Field Service" description="On-site service management" />
                    }
                  />
                  <Route
                    path="helpdesk"
                    element={
                      <GenericPage
                        title="Helpdesk"
                        description="Support tickets and customer service"
                      />
                    }
                  />

                  {/* Design System & Demo Pages */}
                  <Route path="design-system" element={<DesignSystemShowcase />} />
                  <Route path="bms/energy" element={<EnergyPage />} />
                  <Route path="bms/cctv" element={<CCTVLivePage />} />
                  <Route path="food-delivery" element={<FoodDeliveryDashboard />} />
                  <Route path="executive" element={<ExecutiveDashboard />} />

                  {/* AI Center */}
                  <Route
                    path="ai/predictions"
                    element={
                      <AIWorkspacePage title="AI Predictions" />
                    }
                  />
                  <Route
                    path="ai/recommendations"
                    element={
                      <AIWorkspacePage title="AI Recommendations" />
                    }
                  />
                  <Route
                    path="ai/alerts"
                    element={
                      <AIWorkspacePage title="AI Alerts" />
                    }
                  />

                  {/* System */}
                  <Route
                    path="system/users"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}><UserManagement /></ProtectedRoute>
                    }
                  />
                  <Route path="system/permissions" element={<ProtectedRoute requiredRole={adminRoles}><PermissionsPage /></ProtectedRoute>} />

                  {/* Admin */}
                  <Route
                    path="admin/control-tower"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <ControlTowerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/tenants"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <TenantManagementPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/studio"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <StudioPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/metrics"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <SaaSMetricsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/usage"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <UsageTrackingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/automation"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <AutomationRulesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/webhooks"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <WebhookSimulatorPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/auth-docs"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <AuthenticationDocsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* RBAC Admin Pages */}
                  <Route
                    path="admin/users"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <UserManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/roles"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <RolesPermissions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/permissions-matrix"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <PermissionMatrix />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/audit-logs"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}>
                        <AuditLogs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/developer-mode"
                    element={
                      <ProtectedRoute requiredRole={['owner', 'developer']}>
                        <DeveloperMode />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/emergency-access"
                    element={
                      <ProtectedRoute requiredRole={['owner']}>
                        <EmergencyAccess />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute requiredRole={adminRoles}><TenantManagementPage /></ProtectedRoute>
                    }
                  />
                </Route>

                {/* Redirect unknown to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
