-- ============================================
-- ERPX-AI: Row-Level Security Policies for RBAC
-- ============================================

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_override_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Owner and admins can view all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    is_developer(auth.uid()) OR
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Owner and admins can update profiles
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (
    is_owner(auth.uid()) OR
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Owner and admins can create profiles
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT
  WITH CHECK (
    is_owner(auth.uid()) OR
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Only owner can delete profiles
CREATE POLICY "profiles_delete_owner" ON profiles
  FOR DELETE
  USING (is_owner(auth.uid()));

-- ============================================
-- 3. TENANTS TABLE POLICIES
-- ============================================

-- Users can view tenants they belong to
CREATE POLICY "tenants_select_member" ON tenants
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    id IN (
      SELECT tenant_id
      FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Only owner can create tenants
CREATE POLICY "tenants_insert_owner" ON tenants
  FOR INSERT
  WITH CHECK (is_owner(auth.uid()));

-- Owner and super_admin can update tenants
CREATE POLICY "tenants_update_admin" ON tenants
  FOR UPDATE
  USING (
    is_owner(auth.uid()) OR
    (
      has_role(auth.uid(), 'super_admin') AND
      id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    )
  );

-- Only owner can delete tenants
CREATE POLICY "tenants_delete_owner" ON tenants
  FOR DELETE
  USING (is_owner(auth.uid()));

-- ============================================
-- 4. ROLES TABLE POLICIES
-- ============================================

-- Everyone can view roles
CREATE POLICY "roles_select_all" ON roles
  FOR SELECT
  USING (true);

-- Only owner and developer can manage roles
CREATE POLICY "roles_insert_admin" ON roles
  FOR INSERT
  WITH CHECK (is_owner(auth.uid()) OR is_developer(auth.uid()));

CREATE POLICY "roles_update_admin" ON roles
  FOR UPDATE
  USING (is_owner(auth.uid()) OR is_developer(auth.uid()));

CREATE POLICY "roles_delete_admin" ON roles
  FOR DELETE
  USING (is_owner(auth.uid()) OR is_developer(auth.uid()));

-- ============================================
-- 5. PERMISSIONS TABLE POLICIES
-- ============================================

-- Everyone can view permissions
CREATE POLICY "permissions_select_all" ON permissions
  FOR SELECT
  USING (true);

-- Only owner and developer can manage permissions
CREATE POLICY "permissions_insert_admin" ON permissions
  FOR INSERT
  WITH CHECK (is_owner(auth.uid()) OR is_developer(auth.uid()));

CREATE POLICY "permissions_update_admin" ON permissions
  FOR UPDATE
  USING (is_owner(auth.uid()) OR is_developer(auth.uid()));

CREATE POLICY "permissions_delete_admin" ON permissions
  FOR DELETE
  USING (is_owner(auth.uid()) OR is_developer(auth.uid()));

-- ============================================
-- 6. ROLE_PERMISSIONS TABLE POLICIES
-- ============================================

-- Everyone can view role-permission mappings
CREATE POLICY "role_permissions_select_all" ON role_permissions
  FOR SELECT
  USING (true);

-- Only owner and developer can manage role-permission mappings
CREATE POLICY "role_permissions_insert_admin" ON role_permissions
  FOR INSERT
  WITH CHECK (is_owner(auth.uid()) OR is_developer(auth.uid()));

CREATE POLICY "role_permissions_update_admin" ON role_permissions
  FOR UPDATE
  USING (is_owner(auth.uid()) OR is_developer(auth.uid()));

CREATE POLICY "role_permissions_delete_admin" ON role_permissions
  FOR DELETE
  USING (is_owner(auth.uid()) OR is_developer(auth.uid()));

-- ============================================
-- 7. USER_ROLES TABLE POLICIES
-- ============================================

-- Users can view their own roles
CREATE POLICY "user_roles_select_own" ON user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all user roles
CREATE POLICY "user_roles_select_admin" ON user_roles
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    is_developer(auth.uid()) OR
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Owner and admins can assign roles
CREATE POLICY "user_roles_insert_admin" ON user_roles
  FOR INSERT
  WITH CHECK (
    is_owner(auth.uid()) OR
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Owner and admins can update role assignments
CREATE POLICY "user_roles_update_admin" ON user_roles
  FOR UPDATE
  USING (
    is_owner(auth.uid()) OR
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Owner and admins can delete role assignments
CREATE POLICY "user_roles_delete_admin" ON user_roles
  FOR DELETE
  USING (
    is_owner(auth.uid()) OR
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 8. USER_TENANTS TABLE POLICIES
-- ============================================

-- Users can view their own tenant assignments
CREATE POLICY "user_tenants_select_own" ON user_tenants
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view tenant assignments for their tenants
CREATE POLICY "user_tenants_select_admin" ON user_tenants
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    is_developer(auth.uid()) OR
    (
      (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) AND
      tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    )
  );

-- Owner and admins can assign users to tenants
CREATE POLICY "user_tenants_insert_admin" ON user_tenants
  FOR INSERT
  WITH CHECK (
    is_owner(auth.uid()) OR
    (
      (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) AND
      tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    )
  );

-- Owner and admins can update tenant assignments
CREATE POLICY "user_tenants_update_admin" ON user_tenants
  FOR UPDATE
  USING (
    is_owner(auth.uid()) OR
    (
      (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) AND
      tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    )
  );

-- Owner and admins can remove tenant assignments
CREATE POLICY "user_tenants_delete_admin" ON user_tenants
  FOR DELETE
  USING (
    is_owner(auth.uid()) OR
    (
      (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) AND
      tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    )
  );

-- ============================================
-- 9. AUDIT_LOGS TABLE POLICIES
-- ============================================

-- Owner and developer can view all audit logs
CREATE POLICY "audit_logs_select_privileged" ON audit_logs
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    is_developer(auth.uid())
  );

-- Admins can view audit logs for their tenants
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT
  USING (
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) AND
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

-- System can insert audit logs
CREATE POLICY "audit_logs_insert_system" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No one can update or delete audit logs
-- (Audit logs are immutable)

-- ============================================
-- 10. EMERGENCY_ACCESS_LOGS TABLE POLICIES
-- ============================================

-- Owner and developer can view all emergency access logs
CREATE POLICY "emergency_access_select_privileged" ON emergency_access_logs
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    is_developer(auth.uid())
  );

-- Users can view their own emergency access logs
CREATE POLICY "emergency_access_select_own" ON emergency_access_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Only owner can insert emergency access logs (via function)
CREATE POLICY "emergency_access_insert_owner" ON emergency_access_logs
  FOR INSERT
  WITH CHECK (is_owner(auth.uid()));

-- Only owner can update emergency access logs (for revocation)
CREATE POLICY "emergency_access_update_owner" ON emergency_access_logs
  FOR UPDATE
  USING (is_owner(auth.uid()));

-- ============================================
-- 11. DEVELOPER_ACCESS_LOGS TABLE POLICIES
-- ============================================

-- Owner and developer can view all developer access logs
CREATE POLICY "developer_access_select_privileged" ON developer_access_logs
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    is_developer(auth.uid())
  );

-- Developers can insert their own logs
CREATE POLICY "developer_access_insert_developer" ON developer_access_logs
  FOR INSERT
  WITH CHECK (
    is_developer(auth.uid()) AND
    user_id = auth.uid()
  );

-- ============================================
-- 12. OWNER_OVERRIDE_LOGS TABLE POLICIES
-- ============================================

-- Owner and developer can view all override logs
CREATE POLICY "owner_override_select_privileged" ON owner_override_logs
  FOR SELECT
  USING (
    is_owner(auth.uid()) OR
    is_developer(auth.uid())
  );

-- Only owner can insert override logs
CREATE POLICY "owner_override_insert_owner" ON owner_override_logs
  FOR INSERT
  WITH CHECK (
    is_owner(auth.uid()) AND
    user_id = auth.uid()
  );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON POLICY "profiles_select_own" ON profiles IS 'Users can view their own profile';
COMMENT ON POLICY "tenants_select_member" ON tenants IS 'Users can only view tenants they belong to';
COMMENT ON POLICY "audit_logs_select_privileged" ON audit_logs IS 'Only owner and developer can view all audit logs';
