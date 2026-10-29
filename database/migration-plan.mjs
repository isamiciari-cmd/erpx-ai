// One reviewed order for the Supabase schema. Firebase / alternate RBAC SQL
// files in database/ are historical and must not be concatenated into this plan.
export const migrationGroups = [
  { name: '20261022000100_core.sql', files: ['01_schema.sql', '02_rls_policies.sql', '007_schema_compatibility.sql', '03_sales_invoicing_zatca.sql', '006_v2_workflow_compatible.sql'] },
  { name: '20261022000200_transactional_sales.sql', files: ['008_transactional_sales.sql'] },
];
