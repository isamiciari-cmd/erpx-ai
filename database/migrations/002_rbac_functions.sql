-- ============================================
-- ERPX-AI: RBAC Helper Functions
-- ============================================

-- ============================================
-- 1. has_role: Check if user has specific role
-- ============================================
CREATE OR REPLACE FUNCTION has_role(p_user_id UUID, p_role_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = p_role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. has_permission: Check if user has specific permission
-- ============================================
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
    AND p.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. is_owner: Check if user is platform owner
-- ============================================
CREATE OR REPLACE FUNCTION is_owner(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role(p_user_id, 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. is_developer: Check if user is developer
-- ============================================
CREATE OR REPLACE FUNCTION is_developer(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role(p_user_id, 'developer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. get_user_tenants: Get all tenants for user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_tenants(p_user_id UUID)
RETURNS TABLE(tenant_id UUID, tenant_name VARCHAR, tenant_slug VARCHAR, is_primary BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    ut.is_primary
  FROM user_tenants ut
  JOIN tenants t ON ut.tenant_id = t.id
  WHERE ut.user_id = p_user_id
  AND t.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. get_primary_tenant: Get user's primary tenant
-- ============================================
CREATE OR REPLACE FUNCTION get_primary_tenant(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Try to get primary tenant
  SELECT tenant_id INTO v_tenant_id
  FROM user_tenants
  WHERE user_id = p_user_id
  AND is_primary = true
  LIMIT 1;

  -- If no primary, get first tenant
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM user_tenants
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. can_access_tenant: Check if user can access tenant
-- ============================================
CREATE OR REPLACE FUNCTION can_access_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Owner can access all tenants
  IF is_owner(p_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user is assigned to tenant
  RETURN EXISTS (
    SELECT 1
    FROM user_tenants
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. log_audit_event: Create audit log entry
-- ============================================
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action VARCHAR,
  p_table_name VARCHAR DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Get user's primary tenant
  IF v_user_id IS NOT NULL THEN
    v_tenant_id := get_primary_tenant(v_user_id);
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    tenant_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    v_user_id,
    v_tenant_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. log_developer_access: Log developer action
-- ============================================
CREATE OR REPLACE FUNCTION log_developer_access(
  p_action VARCHAR,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Verify user is developer
  IF NOT is_developer(v_user_id) THEN
    RAISE EXCEPTION 'User is not a developer';
  END IF;

  INSERT INTO developer_access_logs (
    user_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_action,
    p_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. log_owner_override: Log owner override action
-- ============================================
CREATE OR REPLACE FUNCTION log_owner_override(
  p_action VARCHAR,
  p_tenant_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Verify user is owner
  IF NOT is_owner(v_user_id) THEN
    RAISE EXCEPTION 'User is not an owner';
  END IF;

  INSERT INTO owner_override_logs (
    user_id,
    action,
    tenant_id,
    reason,
    details
  ) VALUES (
    v_user_id,
    p_action,
    p_tenant_id,
    p_reason,
    p_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. grant_emergency_access: Grant temporary emergency access
-- ============================================
CREATE OR REPLACE FUNCTION grant_emergency_access(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
  v_granter_id UUID;
  v_access_id UUID;
BEGIN
  v_granter_id := auth.uid();

  -- Only owner can grant emergency access
  IF NOT is_owner(v_granter_id) THEN
    RAISE EXCEPTION 'Only owner can grant emergency access';
  END IF;

  INSERT INTO emergency_access_logs (
    user_id,
    reason,
    expires_at
  ) VALUES (
    p_user_id,
    p_reason,
    NOW() + (p_duration_hours || ' hours')::INTERVAL
  ) RETURNING id INTO v_access_id;

  -- Log the action
  PERFORM log_audit_event(
    'GRANT_EMERGENCY_ACCESS',
    'emergency_access_logs',
    v_access_id,
    NULL,
    jsonb_build_object('user_id', p_user_id, 'duration_hours', p_duration_hours)
  );

  RETURN v_access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. revoke_emergency_access: Revoke emergency access
-- ============================================
CREATE OR REPLACE FUNCTION revoke_emergency_access(p_access_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_revoker_id UUID;
BEGIN
  v_revoker_id := auth.uid();

  -- Only owner can revoke emergency access
  IF NOT is_owner(v_revoker_id) THEN
    RAISE EXCEPTION 'Only owner can revoke emergency access';
  END IF;

  UPDATE emergency_access_logs
  SET
    revoked_at = NOW(),
    revoked_by = v_revoker_id,
    is_active = false
  WHERE id = p_access_id
  AND is_active = true;

  -- Log the action
  PERFORM log_audit_event(
    'REVOKE_EMERGENCY_ACCESS',
    'emergency_access_logs',
    p_access_id
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. has_active_emergency_access: Check if user has active emergency access
-- ============================================
CREATE OR REPLACE FUNCTION has_active_emergency_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM emergency_access_logs
    WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > NOW()
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. get_user_permissions: Get all permissions for user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_key VARCHAR, permission_name VARCHAR, category VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.key,
    p.name,
    p.category
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
  ORDER BY p.category, p.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. get_user_roles: Get all roles for user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE(role_name VARCHAR, display_name VARCHAR, level INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.name,
    r.display_name,
    r.level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  ORDER BY r.level DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 16. get_highest_role_level: Get user's highest role level
-- ============================================
CREATE OR REPLACE FUNCTION get_highest_role_level(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_level INTEGER;
BEGIN
  SELECT MAX(r.level) INTO v_level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;

  RETURN COALESCE(v_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION has_role TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION is_owner TO authenticated;
GRANT EXECUTE ON FUNCTION is_developer TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tenants TO authenticated;
GRANT EXECUTE ON FUNCTION get_primary_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION log_developer_access TO authenticated;
GRANT EXECUTE ON FUNCTION log_owner_override TO authenticated;
GRANT EXECUTE ON FUNCTION grant_emergency_access TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_emergency_access TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_emergency_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_highest_role_level TO authenticated;
