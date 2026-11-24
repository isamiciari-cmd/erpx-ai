import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RequireRole } from '../../components/auth';
import { listDirectoryRoles, type DirectoryRole } from '../../services/adminDirectoryService';
import { administrationErrorKey } from '../../i18n/administration';
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  FormField,
  LoadingSkeleton,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  useWorkspaceFormat,
} from '../../app/components/erp/WorkspaceUI';

export function RolePermissionsView({ matrix = false }: { matrix?: boolean }) {
  const { t } = useTranslation('administration');
  const { isRtl, number } = useWorkspaceFormat();
  const { user } = useAuth();
  const [roles, setRoles] = useState<DirectoryRole[]>([]);
  const [selected, setSelected] = useState('');
  const [category, setCategory] = useState('');
  const [roleQuery, setRoleQuery] = useState('');
  const [permissionQuery, setPermissionQuery] = useState('');
  const [matrixView, setMatrixView] = useState(matrix);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const rows = await listDirectoryRoles(user?.company_id ?? '');
      if (request !== generation.current) return;
      const sorted = [...rows].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
      setRoles(sorted);
      setSelected((previous) =>
        sorted.some((role) => role.id === previous) ? previous : (sorted[0]?.id ?? ''),
      );
    } catch (cause) {
      if (request === generation.current) setError(administrationErrorKey(cause));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [user?.company_id]);
  useEffect(() => {
    setRoles([]);
    setSelected('');
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [category, permissionQuery, selected, matrixView]);
  const permissions = useMemo(
    () =>
      [
        ...new Map(
          roles
            .flatMap((role) => role.permissions)
            .map((permission) => [permission.permission_key, permission]),
        ).values(),
      ].sort((a, b) => a.permission_key.localeCompare(b.permission_key)),
    [roles],
  );
  const selectedRole = roles.find((role) => role.id === selected);
  const categories = [...new Set(permissions.map((permission) => permission.category))].sort();
  const filteredRoles = roles.filter((role) =>
    `${role.name} ${role.display_name}`
      .toLocaleLowerCase()
      .includes(roleQuery.trim().toLocaleLowerCase()),
  );
  const grants = matrixView ? permissions : (selectedRole?.permissions ?? []);
  const visible = grants
    .filter(
      (permission) =>
        (!category || permission.category === category) &&
        `${permission.permission_name} ${permission.permission_key}`
          .toLocaleLowerCase()
          .includes(permissionQuery.trim().toLocaleLowerCase()),
    )
    .sort((a, b) => a.permission_key.localeCompare(b.permission_key));
  const pages = Math.max(1, Math.ceil(visible.length / 20));
  const currentPage = Math.min(page, pages);
  const displayed = visible.slice((currentPage - 1) * 20, currentPage * 20);
  const permissionLabel = (key: string, storedName: string) =>
    storedName !== key ? storedName : key.replace(/[._]/g, ' ');

  return (
    <RequireRole role={['owner', 'developer', 'super_admin', 'admin']} redirectTo="/dashboard">
      <section className="ws-page" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          eyebrow={t('common.administration')}
          title={t(matrix ? 'roles.matrixTitle' : 'roles.title')}
          description={t('roles.description')}
          actions={
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} />}
              onClick={() => void load()}
              disabled={loading}
            >
              {t('common.refresh')}
            </Button>
          }
        />
        <p className="ws-inline-message flex items-start gap-3">
          <LockKeyhole size={18} className="mt-0.5 shrink-0" />
          <span>{t('roles.policy')}</span>
        </p>
        <div className="ws-stats">
          <StatCard
            label={t('roles.roleCount')}
            value={(loading || !!error) && !roles.length ? '—' : number(roles.length)}
            icon={<ShieldCheck size={19} />}
          />
          <StatCard
            label={t('roles.permissionCount')}
            value={(loading || !!error) && !roles.length ? '—' : number(permissions.length)}
          />
          <StatCard
            label={t('roles.selectedCount')}
            value={selectedRole ? number(selectedRole.permissions.length) : '—'}
            hint={selectedRole?.display_name}
          />
        </div>
        {error && <ErrorState message={t(error)} onRetry={() => void load()} />}
        {loading && !roles.length ? (
          <LoadingSkeleton rows={7} />
        ) : error && !roles.length ? null : !roles.length ? (
          <EmptyState
            title={t('roles.noRoles')}
            description={t('roles.policy')}
            icon={<ShieldCheck size={26} />}
          />
        ) : (
          <>
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t('roles.title')}
            >
              <Button
                variant={!matrixView ? 'primary' : 'secondary'}
                aria-pressed={!matrixView}
                onClick={() => setMatrixView(false)}
              >
                {t('roles.listView')}
              </Button>
              <Button
                variant={matrixView ? 'primary' : 'secondary'}
                aria-pressed={matrixView}
                onClick={() => setMatrixView(true)}
              >
                {t('roles.matrixView')}
              </Button>
              <StatusBadge>{t('common.readonly')}</StatusBadge>
            </div>
            <div
              className={
                matrixView ? 'space-y-5' : 'grid min-w-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]'
              }
            >
              {!matrixView && (
                <Panel title={t('roles.roleList')}>
                  <FormField label={t('roles.searchRoles')} htmlFor="role-search">
                    <input
                      id="role-search"
                      type="search"
                      className="ws-input"
                      value={roleQuery}
                      onChange={(event) => setRoleQuery(event.target.value)}
                    />
                  </FormField>
                  <div className="mt-4 space-y-2">
                    {filteredRoles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelected(role.id)}
                        aria-pressed={selected === role.id}
                        className={`w-full rounded-xl border p-4 text-start transition-colors ${selected === role.id ? 'border-[#F5C518] bg-[#F5C518]/10' : 'border-[var(--app-border)] hover:bg-[var(--app-surface-2)]'}`}
                      >
                        <span className="block font-semibold">{role.display_name}</span>
                        <span className="ws-muted mt-1 block text-xs" dir="auto">
                          {role.name}
                        </span>
                        <span className="ws-muted mt-2 block text-sm">
                          {t('roles.grantsCount', { count: role.permissions.length })}
                        </span>
                      </button>
                    ))}
                    {!filteredRoles.length && (
                      <p className="ws-muted py-5 text-sm">{t('common.noResults')}</p>
                    )}
                  </div>
                </Panel>
              )}
              <Panel
                title={matrixView ? t('roles.matrixTitle') : selectedRole?.display_name}
                description={t('roles.catalogHint')}
                actions={<StatusBadge>{t('common.readonly')}</StatusBadge>}
              >
                {!matrixView && selectedRole && (
                  <dl className="mb-5 grid gap-4 rounded-xl bg-[var(--app-surface-2)] p-4 sm:grid-cols-3">
                    {[
                      [t('roles.roleName'), selectedRole.name],
                      [
                        t('roles.scope'),
                        t(selectedRole.company_id ? 'roles.scoped' : 'roles.shared'),
                      ],
                      [
                        t('common.status'),
                        selectedRole.status
                          ? ['active', 'inactive', 'suspended'].includes(selectedRole.status)
                            ? t(`common.${selectedRole.status}`)
                            : selectedRole.status
                          : t('common.unknown'),
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="ws-muted text-xs">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-medium">
                          <bdi>{value}</bdi>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <FilterBar>
                  <FormField label={t('roles.searchPermissions')} htmlFor="permission-search">
                    <input
                      id="permission-search"
                      type="search"
                      className="ws-input"
                      value={permissionQuery}
                      onChange={(event) => setPermissionQuery(event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('roles.category')} htmlFor="permission-category">
                    <select
                      id="permission-category"
                      className="ws-input"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      <option value="">{t('roles.allCategories')}</option>
                      {categories.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </FilterBar>
                {!visible.length ? (
                  <EmptyState
                    title={t('roles.noPermissions')}
                    description={t('roles.noPermissionsHint')}
                  />
                ) : (
                  <>
                    <div className="ws-table-wrap">
                      <table className="ws-table">
                        <thead>
                          <tr>
                            <th scope="col">{t('roles.permission')}</th>
                            {matrixView ? (
                              roles.map((role) => (
                                <th key={role.id} scope="col">
                                  {role.display_name}
                                </th>
                              ))
                            ) : (
                              <>
                                <th scope="col">{t('roles.category')}</th>
                                <th scope="col">{t('common.status')}</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {displayed.map((permission) => (
                            <tr key={permission.permission_key}>
                              <td>
                                <span className="block font-medium">
                                  <bdi>
                                    {permissionLabel(
                                      permission.permission_key,
                                      permission.permission_name,
                                    )}
                                  </bdi>
                                </span>
                                <code className="ws-muted mt-1 block text-xs" dir="ltr">
                                  {permission.permission_key}
                                </code>
                              </td>
                              {matrixView ? (
                                roles.map((role) => {
                                  const granted = role.permissions.some(
                                    (item) => item.permission_key === permission.permission_key,
                                  );
                                  return (
                                    <td key={role.id}>
                                      <span
                                        className={
                                          granted
                                            ? 'inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400'
                                            : 'ws-muted'
                                        }
                                      >
                                        {granted && <Check size={15} aria-hidden="true" />}
                                        {t(granted ? 'roles.granted' : 'roles.notGranted')}
                                      </span>
                                    </td>
                                  );
                                })
                              ) : (
                                <>
                                  <td>
                                    <bdi>{permission.category}</bdi>
                                  </td>
                                  <td>
                                    <StatusBadge tone="success">{t('roles.granted')}</StatusBadge>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                      <span className="ws-muted text-sm">
                        {t('common.page', { page: number(currentPage), total: number(pages) })}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          disabled={currentPage === 1}
                          onClick={() => setPage(currentPage - 1)}
                        >
                          {t('common.previous')}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={currentPage === pages}
                          onClick={() => setPage(currentPage + 1)}
                        >
                          {t('common.next')}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Panel>
            </div>
          </>
        )}
      </section>
    </RequireRole>
  );
}
export function RolesPermissions() {
  return <RolePermissionsView />;
}
