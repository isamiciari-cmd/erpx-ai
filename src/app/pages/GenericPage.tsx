import BusinessRecordsPage, { type BusinessField } from '../components/erp/BusinessRecordsPage';

interface GenericPageProps { title: string; description?: string }
const specs: Record<string, { module: string; fields: BusinessField[] }> = {
  CRM: { module: 'crm', fields: [{ key: 'contact', label: 'Contact', required: true }, { key: 'email', label: 'Email', type: 'email' }, { key: 'stage', label: 'Stage', type: 'select', options: ['lead', 'qualified', 'proposal', 'won', 'lost'], required: true }] },
  Subscriptions: { module: 'subscriptions', fields: [{ key: 'customer', label: 'Customer', required: true }, { key: 'billing_cycle', label: 'Billing cycle', type: 'select', options: ['monthly', 'annual'], required: true }, { key: 'next_billing_date', label: 'Next billing date', type: 'date', required: true }] },
  MRP: { module: 'material_plans', fields: [{ key: 'product', label: 'Product / SKU', required: true }, { key: 'required_quantity', label: 'Required quantity', type: 'number', min: 0.001, required: true }, { key: 'required_date', label: 'Required date', type: 'date', required: true }, { key: 'notes', label: 'Materials and dependencies', type: 'textarea' }] },
  PLM: { module: 'product_lifecycle', fields: [{ key: 'product', label: 'Product / SKU', required: true }, { key: 'revision', label: 'Revision', required: true }, { key: 'change', label: 'Change description', type: 'textarea', required: true }] },
  Projects: { module: 'projects', fields: [{ key: 'owner', label: 'Owner', required: true }, { key: 'deadline', label: 'Deadline', type: 'date', required: true }, { key: 'notes', label: 'Scope and deliverables', type: 'textarea', required: true }] },
  Timesheets: { module: 'timesheets', fields: [{ key: 'employee', label: 'Employee', required: true }, { key: 'project', label: 'Project', required: true }, { key: 'hours', label: 'Hours', type: 'number', min: 0.01, required: true }] },
  'Field Service': { module: 'field_service', fields: [{ key: 'customer', label: 'Customer', required: true }, { key: 'location', label: 'Service address', required: true }, { key: 'technician', label: 'Technician', required: true }, { key: 'scheduled_date', label: 'Scheduled date', type: 'date', required: true }, { key: 'notes', label: 'Work description', type: 'textarea' }] },
  Helpdesk: { module: 'helpdesk', fields: [{ key: 'requester', label: 'Requester', required: true }, { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'], required: true }, { key: 'notes', label: 'Issue description', type: 'textarea', required: true }] },
  Settings: { module: 'company_preferences', fields: [{ key: 'value', label: 'Value', required: true }, { key: 'notes', label: 'Description', type: 'textarea' }] },
};
export default function GenericPage({ title, description }: GenericPageProps) {
  const spec = specs[title as keyof typeof specs];
  if (!spec) return <p role="alert">This route has no registered workflow.</p>;
  return <BusinessRecordsPage key={spec.module} {...spec} title={title} description={description} />;
}
