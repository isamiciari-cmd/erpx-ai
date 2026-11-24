import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, MailPlus, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { RequirePermission } from '../../components/auth';
import {
  listCompanyDirectory,
  manageCompanyUser,
  type DirectoryBranch,
  type DirectoryRole,
  type DirectoryUser,
} from '../../services/adminDirectoryService';
import { administrationErrorKey } from '../../i18n/administration';
import {
  Button,
  DetailDrawer,
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

const protectedRoles = ['owner', 'developer', 'super_admin'];
type FormState = {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  branch_id: string;
  status: string;
};
const blank: FormState = {
  email: '',
  first_name: '',
  last_name: '',
  role_id: '',
  branch_id: '',
  status: 'active',
};
const pageSize = 15;

export function UserManagement() {
  const { t } = useTranslation('administration');
  const { user } = useAuth();
  const access = usePermissions();
  const { isRtl, date, number } = useWorkspaceFormat();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [roles, setRoles] = useState<DirectoryRole[]>([]);
  const [branches, setBranches] = useState<DirectoryBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState('');
  const [selected, setSelected] = useState<DirectoryUser | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const generation = useRef(0);
  const saveLock = useRef(false);
  const dirty = !!form && JSON.stringify(form) !== initialForm;
  const administrator =
    ['owner', 'developer', 'super_admin', 'admin'].includes(user?.role?.name ?? '') &&
    ['owner', 'developer', 'super_admin', 'admin'].some(access.hasRole);
  const canInvite = administrator && access.hasPermission('users.create');
  const canEdit = administrator && access.hasPermission('users.update');

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await listCompanyDirectory(user?.company_id ?? '');
      if (request !== generation.current) return;
      setUsers(result.users);
      setRoles(result.roles);
      setBranches(result.branches);
    } catch (cause) {
      if (request === generation.current) setError(administrationErrorKey(cause));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [user?.company_id]);
  useEffect(() => {
    setUsers([]);
    setRoles([]);
    setBranches([]);
    setForm(null);
    setSelected(null);
    setNotice('');
    setPage(1);
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, branchFilter, statusFilter]);
  useUnsavedChanges(dirty, t('common.discard'), { title: t('users.title'), values: form, baseline: initialForm });

  const roleName = (record: DirectoryUser) => roles.find((role) => role.id === record.role_id);
  const editable = (record: DirectoryUser) =>
    canEdit &&
    record.id !== user?.id &&
    !!roleName(record) &&
    !protectedRoles.includes(roleName(record)?.name ?? '');
  const assignableRoles = roles.filter(
    (role) => !protectedRoles.includes(role.name) && (!role.status || role.status === 'active'),
  );
  const openForm = (record?: DirectoryUser) => {
    if ((record && !editable(record)) || (!record && !canInvite)) return;
    const next = record
      ? {
          id: record.id,
          email: record.email,
          first_name: record.first_name,
          last_name: record.last_name,
          role_id: record.role_id,
          branch_id: record.branch_id ?? '',
          status: record.status,
        }
      : { ...blank };
    setInitialForm(JSON.stringify(next));
    setForm(next);
    setSelected(null);
    setFormError('');
    setNotice('');
  };
  const closeForm = () => {
    if (saving || (dirty && !window.confirm(t('common.discard')))) return;
    setForm(null);
    setFormError('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || saveLock.current || (form.id ? !canEdit : !canInvite)) return;
    saveLock.current = true;
    setSaving(true);
    setFormError('');
    setNotice('');
    const request = generation.current;
    try {
      const result = await manageCompanyUser({
        action: form.id ? 'update' : 'invite',
        user_id: form.id,
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role_id: form.role_id,
        branch_id: form.branch_id,
        status: form.status,
      });
      if (request !== generation.current) return;
      setForm(null);
      setNotice(
        result.audit_warning ? 'users.auditWarning' : form.id ? 'users.updated' : 'users.invited',
      );
      await load();
    } catch (cause) {
      if (request === generation.current)
        setFormError(administrationErrorKey(cause, 'common.saveFailed'));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  const visible = useMemo(
    () =>
      users.filter((record) => {
        const haystack =
          `${record.first_name} ${record.last_name} ${record.email}`.toLocaleLowerCase();
        return (
          haystack.includes(query.trim().toLocaleLowerCase()) &&
          (!roleFilter || record.role_id === roleFilter) &&
          (!branchFilter ||
            (branchFilter === 'none' ? !record.branch_id : record.branch_id === branchFilter)) &&
          (!statusFilter || record.status === statusFilter)
        );
      }),
    [users, query, roleFilter, branchFilter, statusFilter],
  );
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const displayed = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const unavailable = !users.length && (loading || !!error);
  const statusLabel = (status: string) =>
    ['active', 'inactive', 'suspended'].includes(status) ? t(`common.${status}`) : status;
  const displayName = (record: DirectoryUser) =>
    [record.first_name, record.last_name].filter(Boolean).join(' ') || record.email;

  return (
    <RequirePermission permission="users.view">
      <section className="ws-page" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          eyebrow={t('common.administration')}
          title={t('users.title')}
          description={t('users.description')}
          actions={
            <>
              <Button
                variant="secondary"
                icon={<RefreshCw size={16} />}
                disabled={loading || saving}
                onClick={() => void load()}
              >
                {t('common.refresh')}
              </Button>
              {canInvite && (
                <Button
                  variant="primary"
                  icon={<MailPlus size={16} />}
                  disabled={loading || saving}
                  onClick={() => openForm()}
                >
                  {t('users.invite')}
                </Button>
              )}
            </>
          }
        />
        {!administrator && <p className="ws-inline-message">{t('users.readOnlyHint')}</p>}
        {notice && (
          <p role="status" className="ws-inline-message ws-success">
            {t(notice)}
          </p>
        )}
        <div className="ws-stats">
          <StatCard
            label={t('users.members')}
            value={unavailable ? '—' : number(users.length)}
            hint={t('users.countsHint')}
            icon={<Users size={19} />}
          />
          <StatCard
            label={t('users.activeMembers')}
            value={
              unavailable
                ? '—'
                : number(users.filter((record) => record.status === 'active').length)
            }
            tone="success"
          />
          <StatCard
            label={t('users.branches')}
            value={unavailable ? '—' : number(branches.length)}
          />
          <StatCard
            label={t('users.roles')}
            value={unavailable ? '—' : number(roles.length)}
            icon={<ShieldCheck size={19} />}
          />
        </div>
        {error && <ErrorState message={t(error)} onRetry={() => void load()} />}
        <Panel
          title={t('users.members')}
          description={t('common.showing', { count: visible.length })}
        >
          <FilterBar>
            <FormField label={t('common.search')} htmlFor="member-search">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute start-3 top-3.5 ws-muted"
                />
                <input
                  id="member-search"
                  type="search"
                  className="ws-input ps-9"
                  placeholder={t('users.search')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </FormField>
            <FormField label={t('users.role')} htmlFor="member-role-filter">
              <select
                id="member-role-filter"
                className="ws-input"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">{t('users.allRoles')}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('users.branch')} htmlFor="member-branch-filter">
              <select
                id="member-branch-filter"
                className="ws-input"
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
              >
                <option value="">{t('users.allBranches')}</option>
                <option value="none">{t('users.noBranch')}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('common.status')} htmlFor="member-status-filter">
              <select
                id="member-status-filter"
                className="ws-input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">{t('users.allStatuses')}</option>
                {['active', 'inactive', 'suspended'].map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </FormField>
          </FilterBar>
          {loading && !users.length ? (
            <LoadingSkeleton rows={5} />
          ) : error && !users.length ? null : !displayed.length ? (
            <EmptyState
              title={t(users.length ? 'common.noResults' : 'users.noMembers')}
              description={t(users.length ? 'users.filteredEmpty' : 'users.noMembersHint')}
              action={
                users.length ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setRoleFilter('');
                      setBranchFilter('');
                      setStatusFilter('');
                    }}
                  >
                    {t('common.clearFilters')}
                  </Button>
                ) : undefined
              }
              icon={<Users size={26} />}
            />
          ) : (
            <>
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      {[
                        'users.member',
                        'users.email',
                        'users.role',
                        'users.branch',
                        'common.status',
                        'users.actions',
                      ].map((key) => (
                        <th key={key} scope="col">
                          {t(key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <button
                            className="font-semibold hover:underline"
                            onClick={() => setSelected(record)}
                          >
                            {displayName(record)}
                          </button>
                        </td>
                        <td>
                          <bdi dir="ltr">{record.email}</bdi>
                        </td>
                        <td>{roleName(record)?.display_name || t('common.unknown')}</td>
                        <td>
                          {branches.find((branch) => branch.id === record.branch_id)?.name ||
                            t(record.branch_id ? 'common.unknown' : 'users.noBranch')}
                        </td>
                        <td>
                          <StatusBadge
                            tone={
                              record.status === 'active'
                                ? 'success'
                                : record.status === 'suspended'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {statusLabel(record.status)}
                          </StatusBadge>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            icon={<Eye size={16} />}
                            onClick={() => setSelected(record)}
                            aria-label={`${t('common.details')}: ${displayName(record)}`}
                          >
                            {t('common.details')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <p className="ws-muted text-sm">
                  {t('common.page', { page: number(currentPage), total: number(pages) })}
                </p>
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
        <DetailDrawer
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected ? displayName(selected) : t('users.member')}
          description={t('users.accessTitle')}
          footer={
            selected && editable(selected) ? (
              <Button variant="primary" onClick={() => openForm(selected)}>{t('common.edit')}</Button>
            ) : undefined
          }
        >
          {selected && (
            <div className="space-y-6">
              <dl className="space-y-4">
                {[
                  [t('users.email'), selected.email],
                  [t('users.role'), roleName(selected)?.display_name || t('common.unknown')],
                  [
                    t('users.branch'),
                    branches.find((branch) => branch.id === selected.branch_id)?.name ||
                      t(selected.branch_id ? 'common.unknown' : 'users.noBranch'),
                  ],
                  [t('common.status'), statusLabel(selected.status)],
                  [t('users.created'), date(selected.created_at)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="ws-muted text-sm">{label}</dt>
                    <dd className="mt-1 break-words font-medium">
                      <bdi>{value}</bdi>
                    </dd>
                  </div>
                ))}
              </dl>
              <Panel title={t('users.accessTitle')}>
                <p className="ws-muted text-sm">{t('users.accessHint')}</p>
                {selected.id === user?.id ? (
                  <p className="ws-inline-message mt-4">{t('users.selfProtected')}</p>
                ) : protectedRoles.includes(roleName(selected)?.name ?? '') ? (
                  <p className="ws-inline-message mt-4">{t('users.protected')}</p>
                ) : null}
              </Panel>
            </div>
          )}
        </DetailDrawer>
        <DetailDrawer
          open={!!form}
          onClose={closeForm}
          title={t(form?.id ? 'users.editTitle' : 'users.inviteTitle')}
          description={t(form?.id ? 'users.accessSensitive' : 'users.invitationHint')}
          footer={
            <>
              <Button variant="secondary" disabled={saving} onClick={closeForm}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                form="company-member-form"
                loading={saving}
                disabled={!assignableRoles.length || (!!form?.id && !dirty)}
              >
                {t(form?.id ? 'common.save' : 'users.sendInvitation')}
              </Button>
            </>
          }
        >
          {form && (
            <form id="company-member-form" className="space-y-5" onSubmit={save}>
              {formError && (
                <p role="alert" className="ws-inline-message ws-error">
                  {t(formError)}
                </p>
              )}
              {!assignableRoles.length && (
                <p className="ws-inline-message ws-warning">{t('users.noAssignableRoles')}</p>
              )}
              <FormField label={t('users.email')} htmlFor="member-email">
                <input
                  id="member-email"
                  type="email"
                  dir="ltr"
                  className="ws-input"
                  maxLength={254}
                  autoComplete="email"
                  required
                  disabled={!!form.id || saving}
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </FormField>
              <div className="ws-form-grid">
                <FormField label={t('users.firstName')} htmlFor="member-first">
                  <input
                    id="member-first"
                    className="ws-input"
                    required
                    maxLength={100}
                    disabled={saving}
                    value={form.first_name}
                    onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                  />
                </FormField>
                <FormField label={t('users.lastName')} htmlFor="member-last">
                  <input
                    id="member-last"
                    className="ws-input"
                    maxLength={100}
                    disabled={saving}
                    value={form.last_name}
                    onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                  />
                </FormField>
              </div>
              <FormField label={t('users.role')} htmlFor="member-role">
                <select
                  id="member-role"
                  className="ws-input"
                  required
                  disabled={saving}
                  value={form.role_id}
                  onChange={(event) => setForm({ ...form, role_id: event.target.value })}
                >
                  <option value="">{t('users.selectRole')}</option>
                  {assignableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t('users.branch')} htmlFor="member-branch">
                <select
                  id="member-branch"
                  className="ws-input"
                  disabled={saving}
                  value={form.branch_id}
                  onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
                >
                  <option value="">{t('users.noBranch')}</option>
                  {form.branch_id && !branches.some((branch) => branch.id === form.branch_id) && (
                    <option value={form.branch_id} disabled>
                      {t('common.unknown')}
                    </option>
                  )}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t('common.status')} htmlFor="member-status">
                <select
                  id="member-status"
                  className="ws-input"
                  disabled={saving}
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                >
                  {['active', 'inactive', 'suspended'].map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </FormField>
              {dirty && <p className="ws-inline-message ws-warning">{t('common.unsaved')}</p>}
            </form>
          )}
        </DetailDrawer>
      </section>
    </RequirePermission>
  );
}
