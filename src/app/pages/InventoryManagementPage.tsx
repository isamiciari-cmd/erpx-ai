import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArrowDownToLine,
  Check,
  Download,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../lib/supabase';
import {
  createProduct,
  updateProduct,
  archiveProduct,
  type Product,
  type CreateProductInput,
} from '../../services/productsService';
import type { InventoryItem } from '../../services/inventoryService';
import {
  listBusinessProducts,
  listBusinessInventory,
  listBusinessWarehouses,
  receiveBusinessStock,
  type BusinessWarehouse,
} from '../../services/businessInventoryService';
import { downloadCsv } from '../utils/reporting';
import {
  Button,
  ConfirmDialog,
  DataTable,
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
} from '../components/erp/WorkspaceUI';

const blank = () => ({
  sku: '',
  product_name: '',
  barcode: '',
  description: '',
  unit_price: 0,
  cost_price: 0,
  vat_rate: 15,
  min_stock_level: 0,
  unit_of_measure: 'PCS',
  product_type: 'GOODS' as CreateProductInput['product_type'],
  track_inventory: true,
  is_active: true,
});
export default function InventoryManagementPage() {
  const { t } = useTranslation('operations');
  const { user, roles, permissions } = useAuth();
  const companyId = user?.company_id || '';
  const format = useWorkspaceFormat();
  const canWrite =
    roles.some((role) =>
      ['owner', 'developer', 'super_admin', 'admin', 'manager'].includes(role.role_name),
    ) ||
    permissions.some((permission) =>
      ['inventory', 'inventory.write', 'inventory.create', '*', 'all'].includes(
        permission.permission_key,
      ),
    );
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<BusinessWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ key: string; name: string }>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Product>();
  const [editing, setEditing] = useState<Product>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const formBaseline = useRef(blank());
  const [formError, setFormError] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Product>();
  const [receiving, setReceiving] = useState<Product>();
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState('');
  const requestId = useRef(''),
    generation = useRef(0),
    lock = useRef(false);
  useRecoverableInputs(showForm, { title: t('inventory.title'), values: form, baseline: formBaseline.current });
  useRecoverableInputs(!!receiving, {
    title: t('inventory.receiveTitle', { name: receiving?.product_name || '' }),
    values: { warehouse, quantity, reference }, baseline: { warehouse: '', quantity: 1, reference: '' },
  });
  const load = useCallback(async () => {
    const request = ++generation.current;
    if (!companyId) {
      setLoading(false);
      setError('errors.company');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        setError('errors.demo');
        return;
      }
      const [catalog, balances, locations] = await Promise.all([
        listBusinessProducts(companyId),
        listBusinessInventory(companyId),
        listBusinessWarehouses(companyId),
      ]);
      if (request === generation.current) {
        setProducts(catalog);
        setInventory(balances);
        setWarehouses(locations);
      }
    } catch {
      if (request === generation.current) setError('errors.load');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    setProducts([]);
    setInventory([]);
    setWarehouses([]);
    setSelected(undefined);
    setShowForm(false);
    setReceiving(undefined);
    setArchiveTarget(undefined);
    setNotice(undefined);
    setWarehouseFilter('');
    setCategory('');
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const stock = useMemo(() => {
    const result = new Map<string, { onHand: number; reserved: number }>();
    for (const row of inventory) {
      if (warehouseFilter && row.warehouse_id !== warehouseFilter) continue;
      const previous = result.get(row.product_id) || { onHand: 0, reserved: 0 };
      result.set(row.product_id, {
        onHand: previous.onHand + Number(row.quantity_available),
        reserved: previous.reserved + Number(row.quantity_reserved),
      });
    }
    return result;
  }, [inventory, warehouseFilter]);
  const balance = (product: Product) => {
    const value = stock.get(product.id) || { onHand: 0, reserved: 0 };
    return { ...value, available: value.onHand - value.reserved };
  };
  const low = (product: Product) =>
    product.is_active &&
    product.track_inventory &&
    balance(product).available <= Number(product.min_stock_level);
  const rows = products.filter(
    (product) =>
      `${product.sku} ${product.product_name} ${product.barcode || ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'active' && product.is_active) ||
        (filter === 'archived' && !product.is_active) ||
        (filter === 'low' && low(product))) &&
      (!category ||
        (category === 'none' ? !product.category_id : product.category_id === category)),
  );
  const categories = [
    ...new Set(
      products.map((product) => product.category_id).filter((value): value is string => !!value),
    ),
  ].sort();
  const formatCost = (value: number) =>
    user?.company?.currency
      ? format.money(value, user.company.currency)
      : `${format.number(value)} · ${t('common.unknownCurrency')}`;
  const stockValue = rows.reduce(
    (sum, product) => sum + balance(product).onHand * Number(product.cost_price),
    0,
  );
  function startEdit(product?: Product) {
    if (!canWrite || busy) return;
    setSelected(undefined);
    setEditing(product);
    const initial = product
        ? {
            sku: product.sku,
            product_name: product.product_name,
            barcode: product.barcode || '',
            description: product.description || '',
            unit_price: Number(product.unit_price),
            cost_price: Number(product.cost_price),
            vat_rate: Number(product.vat_rate),
            min_stock_level: Number(product.min_stock_level),
            unit_of_measure: product.unit_of_measure || 'PCS',
            product_type: product.product_type,
            track_inventory: product.track_inventory,
            is_active: product.is_active,
          }
        : blank();
    formBaseline.current = initial;
    setForm(initial);
    setFormError('');
    setShowForm(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || lock.current || !companyId) return;
    if (!form.sku.trim() || !form.product_name.trim()) {
      setFormError('errors.requiredProduct');
      return;
    }
    if (
      [form.unit_price, form.cost_price, form.vat_rate, form.min_stock_level].some(
        (value) => !Number.isFinite(value) || value < 0,
      ) ||
      form.vat_rate > 100 ||
      !Number.isInteger(form.min_stock_level)
    ) {
      setFormError('errors.pricing');
      return;
    }
    lock.current = true;
    setBusy(true);
    setFormError('');
    const scope = generation.current;
    try {
      const payload = { ...form, sku: form.sku.trim(), product_name: form.product_name.trim() };
      if (editing) await updateProduct(editing.id, { ...payload, updated_by: user?.id });
      else
        await createProduct({
          ...payload,
          company_id: companyId,
          category_id: null,
          tracking_method: 'NONE',
          created_by: user?.id,
        });
      if (scope !== generation.current) return;
      setShowForm(false);
      setNotice({ key: 'inventory.productSaved', name: form.product_name });
      await load();
    } catch {
      if (scope === generation.current) setFormError('errors.saveProduct');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function changeStatus(product: Product) {
    if (!canWrite || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const scope = generation.current;
    try {
      if (product.is_active) await archiveProduct(product.id);
      else await updateProduct(product.id, { is_active: true });
      if (scope !== generation.current) return;
      setArchiveTarget(undefined);
      setSelected(undefined);
      setNotice({
        key: product.is_active ? 'inventory.archived' : 'inventory.reactivated',
        name: product.product_name,
      });
      await load();
    } catch {
      if (scope === generation.current) {
        setArchiveTarget(undefined);
        setError('errors.archive');
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function startReceipt(product: Product) {
    if (!canWrite || busy) return;
    setSelected(undefined);
    setReceiving(product);
    setWarehouse(warehouseFilter || warehouses[0]?.id || '');
    setQuantity(1);
    setReference('');
    requestId.current = crypto.randomUUID();
    setFormError('');
  }
  async function receive(event: FormEvent) {
    event.preventDefault();
    if (!receiving || !canWrite || lock.current) return;
    if (
      !warehouse ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000000 ||
      !reference.trim()
    ) {
      setFormError('errors.stockQuantity');
      return;
    }
    lock.current = true;
    setBusy(true);
    setFormError('');
    const scope = generation.current;
    try {
      await receiveBusinessStock(
        companyId,
        receiving.id,
        warehouse,
        quantity,
        reference,
        requestId.current,
      );
      if (scope !== generation.current) return;
      setNotice({ key: 'inventory.receiptSaved', name: receiving.product_name });
      setReceiving(undefined);
      await load();
    } catch {
      if (scope === generation.current) setFormError('errors.receive');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function exportCsv() {
    downloadCsv(
      'inventory',
      rows.map((product) => ({
        [t('common.sku')]: product.sku,
        [t('common.product')]: product.product_name,
        [t('common.barcode')]: product.barcode,
        [t('common.warehouse')]:
          warehouses.find((row) => row.id === warehouseFilter)?.name ||
          t('inventory.allWarehouses'),
        [t('inventory.onHand')]: balance(product).onHand,
        [t('inventory.reserved')]: balance(product).reserved,
        [t('inventory.available')]: balance(product).available,
        [t('inventory.unitCost')]: product.cost_price,
        [t('inventory.sellingPrice')]: product.unit_price,
        [t('common.currency')]: user?.company?.currency || '',
        [t('inventory.vatRate')]: product.vat_rate,
        [t('common.status')]: t(product.is_active ? 'common.active' : 'common.archived'),
      })),
    );
  }
  const detailBalances = inventory.filter(
    (row) =>
      row.product_id === selected?.id && (!warehouseFilter || row.warehouse_id === warehouseFilter),
  );
  const statusBadge = (product: Product) => (
    <StatusBadge status={product.is_active ? 'active' : 'archived'}>
      {t(product.is_active ? 'common.active' : 'common.archived')}
    </StatusBadge>
  );
  return (
    <div className="ws-page">
      <PageHeader
        title={t('inventory.title')}
        description={t('inventory.description')}
        eyebrow={t('common.business')}
        actions={
          <>
            <Button
              onClick={() => void load()}
              disabled={loading || busy}
              icon={<RefreshCw size={16} />}
            >
              {t('common.refresh')}
            </Button>
            <Button
              onClick={exportCsv}
              disabled={loading || !rows.length || !!error}
              icon={<Download size={16} />}
            >
              {t('common.export')}
            </Button>
            {canWrite && (
              <Button
                variant="primary"
                icon={<Plus size={17} />}
                onClick={() => startEdit()}
                disabled={loading || busy || !!error}
              >
                {t('inventory.newProduct')}
              </Button>
            )}
          </>
        }
      />
      {error && <ErrorState message={t(error)} onRetry={() => void load()} />}
      {notice && (
        <p role="status" className="ws-inline-message ws-success">
          <Check size={17} aria-hidden="true" />
          {t(notice.key, { name: notice.name })}
        </p>
      )}
      {!canWrite && <p className="ws-inline-message">{t('common.permissionHint')}</p>}
      {loading && !products.length ? (
        <LoadingSkeleton cards={4} rows={5} />
      ) : (
        (!error || !!products.length) && (
          <div className="ws-stats">
            <StatCard
              label={t('inventory.activeProducts')}
              value={format.number(rows.filter((product) => product.is_active).length)}
              hint={t('inventory.productsHint', { count: rows.length })}
              icon={<Package size={20} />}
            />
            <StatCard
              label={t('inventory.stockValue')}
              value={formatCost(stockValue)}
              hint={t('inventory.valuationHint')}
              icon={<Warehouse size={20} />}
            />
            <StatCard
              label={t('inventory.lowStock')}
              value={format.number(rows.filter(low).length)}
              hint={t('inventory.thresholdHint')}
              tone="warning"
              icon={<PackagePlus size={20} />}
            />
            <StatCard
              label={t('inventory.reserved')}
              value={format.number(
                rows.reduce((sum, product) => sum + balance(product).reserved, 0),
              )}
              hint={t('inventory.availableHint')}
              icon={<ShieldCheck size={20} />}
            />
          </div>
        )
      )}
      <Panel>
        <div className="p-4">
          <FilterBar>
            <FormField label={t('common.search')} htmlFor="inventory-search">
              <input
                id="inventory-search"
                className="ws-input"
                type="search"
                placeholder={t('inventory.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <FormField label={t('common.status')} htmlFor="inventory-status">
              <select
                id="inventory-status"
                className="ws-input"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                {['all', 'active', 'archived', 'low'].map((value) => (
                  <option key={value} value={value}>
                    {value === 'all'
                      ? t('inventory.allProducts')
                      : value === 'low'
                        ? t('inventory.lowStock')
                        : t(`common.${value}`)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('common.warehouse')} htmlFor="inventory-warehouse">
              <select
                id="inventory-warehouse"
                className="ws-input"
                value={warehouseFilter}
                onChange={(event) => setWarehouseFilter(event.target.value)}
              >
                <option value="">{t('inventory.allWarehouses')}</option>
                {warehouses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('common.category')} htmlFor="inventory-category">
              <select
                id="inventory-category"
                className="ws-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">{t('inventory.allCategories')}</option>
                <option value="none">{t('inventory.uncategorized')}</option>
                {categories.map((id) => (
                  <option key={id} value={id}>
                    {t('inventory.categoryReference', { reference: id.slice(0, 8) })}
                  </option>
                ))}
              </select>
            </FormField>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setFilter('all');
                setWarehouseFilter('');
                setCategory('');
              }}
            >
              {t('common.clearFilters')}
            </Button>
          </FilterBar>
        </div>
        {warehouseFilter && (
          <p className="ws-muted px-5 pb-4 text-xs">{t('inventory.selectedWarehouse')}</p>
        )}
        {loading && !products.length ? (
          <LoadingSkeleton rows={5} />
        ) : !products.length && !error ? (
          <EmptyState
            title={t('inventory.emptyTitle')}
            description={t('inventory.emptyDescription')}
            icon={<Package size={28} />}
            action={
              canWrite ? (
                <Button variant="primary" onClick={() => startEdit()} icon={<Plus size={16} />}>
                  {t('inventory.newProduct')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            rows={rows}
            getRowKey={(product) => product.id}
            caption={t('inventory.rows')}
            emptyTitle={error ? t('errors.load') : t('inventory.noMatches')}
            emptyDescription={error ? undefined : t('common.filterHint')}
            columns={[
              {
                key: 'product',
                label: t('common.product'),
                sortValue: (product) => product.product_name,
                render: (product) => (
                  <button className="text-start" onClick={() => setSelected(product)}>
                    <span className="font-semibold hover:underline underline-offset-4">
                      {product.product_name}
                    </span>
                    <span className="ws-muted mt-1 block text-xs" dir="ltr">
                      {product.sku}
                    </span>
                  </button>
                ),
              },
              {
                key: 'onHand',
                label: t('inventory.onHand'),
                sortValue: (product) => balance(product).onHand,
                render: (product) => format.number(balance(product).onHand),
              },
              {
                key: 'reserved',
                label: t('inventory.reserved'),
                sortValue: (product) => balance(product).reserved,
                render: (product) => format.number(balance(product).reserved),
              },
              {
                key: 'available',
                label: t('inventory.available'),
                sortValue: (product) => balance(product).available,
                render: (product) => (
                  <div className="space-y-1">
                    <span className="font-semibold">
                      {format.number(balance(product).available)}
                    </span>
                    {low(product) && (
                      <span className="block text-xs text-amber-700 dark:text-amber-300">
                        {t('inventory.low')}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'cost',
                label: t('inventory.unitCost'),
                sortValue: (product) => Number(product.cost_price),
                render: (product) => (
                  <span className="whitespace-nowrap" dir="auto">
                    {formatCost(Number(product.cost_price))}
                  </span>
                ),
              },
              {
                key: 'price',
                label: t('inventory.sellingPrice'),
                sortValue: (product) => Number(product.unit_price),
                render: (product) => (
                  <span className="whitespace-nowrap" dir="auto">
                    {formatCost(Number(product.unit_price))}
                  </span>
                ),
              },
              { key: 'status', label: t('common.status'), render: statusBadge },
              {
                key: 'actions',
                label: t('common.actions'),
                render: (product) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => setSelected(product)}>
                      {t('common.details')}
                    </Button>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        aria-label={`${t('common.edit')} ${product.product_name}`}
                        icon={<Pencil size={15} />}
                        onClick={() => startEdit(product)}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
        <p className="ws-muted border-t border-[var(--app-border)] px-5 py-4 text-xs">
          {t('common.filteredScope')} {t('inventory.availableHint')}
        </p>
      </Panel>
      <DetailDrawer
        open={!!selected}
        onClose={() => {
          if (!busy) setSelected(undefined);
        }}
        title={selected?.product_name || t('inventory.details')}
        description={selected?.sku}
        footer={
          selected &&
          canWrite && (
            <>
              <Button
                icon={<Pencil size={16} />}
                onClick={() => startEdit(selected)}
                disabled={busy}
              >
                {t('common.edit')}
              </Button>
              {selected.is_active && selected.track_inventory && (
                <Button
                  variant="primary"
                  icon={<ArrowDownToLine size={16} />}
                  disabled={busy || !warehouses.length}
                  onClick={() => startReceipt(selected)}
                >
                  {t('inventory.receive')}
                </Button>
              )}
              <Button
                variant={selected.is_active ? 'ghost' : 'secondary'}
                disabled={busy}
                icon={<Archive size={16} />}
                onClick={() =>
                  selected.is_active ? setArchiveTarget(selected) : void changeStatus(selected)
                }
              >
                {t(selected.is_active ? 'inventory.archive' : 'inventory.reactivate')}
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              {statusBadge(selected)}
              <span className="ws-muted text-sm">
                {t(`productTypes.${selected.product_type}`, {
                  defaultValue: selected.product_type || t('common.noValue'),
                })}
              </span>
            </div>
            <dl className="ws-form-grid">
              {[
                [t('common.sku'), selected.sku],
                [t('common.barcode'), selected.barcode || t('common.noValue')],
                [t('inventory.unitOfMeasure'), selected.unit_of_measure || t('common.noValue')],
                [t('common.category'), selected.category_id || t('inventory.noCategory')],
                [t('inventory.unitCost'), formatCost(Number(selected.cost_price))],
                [t('inventory.sellingPrice'), formatCost(Number(selected.unit_price))],
                [t('inventory.vatRate'), `${format.number(selected.vat_rate)}%`],
                [t('inventory.minimum'), format.number(selected.min_stock_level)],
                [t('common.created'), format.date(selected.created_at)],
                [t('common.updated'), format.date(selected.updated_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="ws-muted text-xs">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium" dir="auto">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {selected.description && (
              <div>
                <h3 className="mb-2 font-semibold">{t('common.description')}</h3>
                <p className="whitespace-pre-wrap text-sm ws-muted">{selected.description}</p>
              </div>
            )}
            <p className="ws-inline-message">
              {t(selected.track_inventory ? 'inventory.tracked' : 'inventory.notTracked')}
            </p>
            <Panel
              title={t('inventory.warehouseBalances')}
              description={t('inventory.balancesDescription')}
            >
              <DataTable
                rows={detailBalances}
                getRowKey={(row) => row.id}
                emptyTitle={t('inventory.noBalances')}
                columns={[
                  {
                    key: 'warehouse',
                    label: t('common.warehouse'),
                    render: (row) =>
                      row.warehouse?.name ||
                      warehouses.find((location) => location.id === row.warehouse_id)?.name ||
                      t('inventory.noWarehouse', { reference: row.warehouse_id.slice(0, 8) }),
                  },
                  {
                    key: 'onHand',
                    label: t('inventory.onHand'),
                    render: (row) => format.number(row.quantity_available),
                  },
                  {
                    key: 'reserved',
                    label: t('inventory.reserved'),
                    render: (row) => format.number(row.quantity_reserved),
                  },
                  {
                    key: 'available',
                    label: t('inventory.available'),
                    render: (row) =>
                      format.number(Number(row.quantity_available) - Number(row.quantity_reserved)),
                  },
                ]}
              />
            </Panel>
          </div>
        )}
      </DetailDrawer>
      <DetailDrawer
        open={showForm}
        onClose={() => {
          if (!busy) setShowForm(false);
        }}
        title={t(editing ? 'inventory.edit' : 'inventory.newProduct')}
        description={t('inventory.productDescription')}
        wide
        footer={
          <>
            <Button disabled={busy} onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="product-form"
              variant="primary"
              loading={busy}
              icon={<Check size={16} />}
            >
              {t('inventory.save')}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} className="space-y-6">
          {formError && (
            <p role="alert" className="ws-inline-message ws-error">
              {t(formError)}
            </p>
          )}
          <fieldset disabled={busy} className="space-y-6">
            <div>
              <h3 className="mb-4 font-semibold">{t('inventory.identifier')}</h3>
              <div className="ws-form-grid">
                {(['sku', 'product_name', 'barcode', 'unit_of_measure'] as const).map((key) => (
                  <FormField
                    key={key}
                    label={t(
                      key === 'sku'
                        ? 'common.sku'
                        : key === 'product_name'
                          ? 'inventory.productName'
                          : key === 'barcode'
                            ? 'common.barcode'
                            : 'inventory.unitOfMeasure',
                    )}
                    htmlFor={`product-${key}`}
                  >
                    <input
                      id={`product-${key}`}
                      className="ws-input"
                      required={key === 'sku' || key === 'product_name'}
                      maxLength={key === 'product_name' ? 250 : 100}
                      value={form[key]}
                      dir={key === 'sku' || key === 'barcode' ? 'ltr' : undefined}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, [key]: event.target.value }))
                      }
                    />
                  </FormField>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-4 font-semibold">{t('inventory.pricing')}</h3>
              <div className="ws-form-grid">
                {(['unit_price', 'cost_price', 'vat_rate'] as const).map((key) => (
                  <FormField
                    key={key}
                    label={t(
                      key === 'unit_price'
                        ? 'inventory.sellingPrice'
                        : key === 'cost_price'
                          ? 'inventory.unitCost'
                          : 'inventory.vatRate',
                    )}
                    htmlFor={`product-${key}`}
                    hint={
                      key !== 'vat_rate'
                        ? user?.company?.currency || t('common.unknownCurrency')
                        : undefined
                    }
                  >
                    <input
                      id={`product-${key}`}
                      className="ws-input"
                      type="number"
                      min="0"
                      max={key === 'vat_rate' ? 100 : undefined}
                      step="0.01"
                      required
                      value={form[key]}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, [key]: Number(event.target.value) }))
                      }
                    />
                  </FormField>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-4 font-semibold">{t('inventory.policy')}</h3>
              <div className="ws-form-grid">
                <FormField label={t('inventory.type')} htmlFor="product-type">
                  <select
                    id="product-type"
                    className="ws-input"
                    value={form.product_type}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        product_type: event.target.value as CreateProductInput['product_type'],
                      }))
                    }
                  >
                    {['GOODS', 'SERVICE', 'ASSET'].map((value) => (
                      <option key={value} value={value}>
                        {t(`productTypes.${value}`)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t('inventory.minimum')} htmlFor="product-minimum">
                  <input
                    id="product-minimum"
                    className="ws-input"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.min_stock_level}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        min_stock_level: Number(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#111827]"
                    checked={form.track_inventory}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        track_inventory: event.target.checked,
                      }))
                    }
                  />
                  {t('inventory.track')}
                </label>
              </div>
            </div>
            <FormField label={t('common.description')} htmlFor="product-description">
              <textarea
                id="product-description"
                className="ws-input"
                rows={3}
                maxLength={4000}
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, description: event.target.value }))
                }
              />
            </FormField>
          </fieldset>
          <p className="ws-muted text-xs">{t('inventory.formHint')}</p>
        </form>
      </DetailDrawer>
      <DetailDrawer
        open={!!receiving}
        onClose={() => {
          if (!busy) setReceiving(undefined);
        }}
        title={t('inventory.receiveTitle', { name: receiving?.product_name || '' })}
        description={t('inventory.receiveDescription')}
        footer={
          <>
            <Button disabled={busy} onClick={() => setReceiving(undefined)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="stock-receipt-form"
              variant="primary"
              loading={busy}
              disabled={!warehouses.length}
              icon={<ArrowDownToLine size={16} />}
            >
              {t('inventory.receiveAction')}
            </Button>
          </>
        }
      >
        {receiving && (
          <form id="stock-receipt-form" onSubmit={receive} className="space-y-5">
            <p className="ws-inline-message">
              {t('inventory.receiveHint', { cost: formatCost(Number(receiving.cost_price)) })}
            </p>
            {formError && (
              <p role="alert" className="ws-inline-message ws-error">
                {t(formError)}
              </p>
            )}
            {!warehouses.length && (
              <p className="ws-inline-message ws-warning">{t('inventory.warehouseMissing')}</p>
            )}
            <fieldset disabled={busy} className="space-y-4">
              <FormField label={t('common.warehouse')} htmlFor="receipt-warehouse">
                <select
                  id="receipt-warehouse"
                  className="ws-input"
                  required
                  value={warehouse}
                  onChange={(event) => setWarehouse(event.target.value)}
                >
                  <option value="">{t('common.select')}</option>
                  {warehouses.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t('common.quantity')} htmlFor="stock-quantity">
                <input
                  id="stock-quantity"
                  className="ws-input"
                  required
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </FormField>
              <FormField label={t('inventory.reference')} htmlFor="stock-reference">
                <input
                  id="stock-reference"
                  className="ws-input"
                  required
                  maxLength={250}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </FormField>
            </fieldset>
          </form>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open && !busy) setArchiveTarget(undefined);
        }}
        title={t('inventory.archiveTitle')}
        description={t('inventory.archiveDescription')}
        onConfirm={() => (archiveTarget ? changeStatus(archiveTarget) : undefined)}
        confirmLabel={t('inventory.archiveAction')}
        busy={busy}
      />
    </div>
  );
}
import { useRecoverableInputs } from '../../hooks/useUnsavedChanges';
