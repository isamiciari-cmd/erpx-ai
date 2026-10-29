import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../lib/supabase';
import {
  createProduct,
  updateProduct,
  archiveProduct,
  type Product,
  type CreateProductInput,
} from '../../services/productsService';
import { type InventoryItem } from '../../services/inventoryService';
import {
  listBusinessProducts,
  listBusinessInventory,
  listBusinessWarehouses,
  receiveBusinessStock,
  type BusinessWarehouse,
} from '../../services/businessInventoryService';
import { recordsToCsv } from '../../services/businessRules';
import { downloadBusinessCsv } from '../../services/businessRecordsService';

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
const inputClass = 'mt-1 w-full rounded-lg border bg-transparent p-2';
export default function InventoryManagementPage() {
  const { user } = useAuth();
  const companyId = user?.company_id || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<BusinessWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Product>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [receiving, setReceiving] = useState<Product>();
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState('');
  const [requestId, setRequestId] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setProducts([]);
    setInventory([]);
    try {
      if (isDemoMode) throw new Error('Connect Supabase to manage products and inventory.');
      const [p, i, w] = await Promise.all([
        listBusinessProducts(companyId),
        listBusinessInventory(companyId),
        listBusinessWarehouses(companyId),
      ]);
      setProducts(p);
      setInventory(i);
      setWarehouses(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    void load();
  }, [load]);
  const stock = useMemo(() => {
    const map = new Map<string, { onHand: number; reserved: number }>();
    for (const row of inventory) {
      const prev = map.get(row.product_id) || { onHand: 0, reserved: 0 };
      map.set(row.product_id, {
        onHand: prev.onHand + Number(row.quantity_available),
        reserved: prev.reserved + Number(row.quantity_reserved),
      });
    }
    return map;
  }, [inventory]);
  const rows = products.filter(
    (p) =>
      `${p.sku} ${p.product_name} ${p.barcode || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'active' && p.is_active) ||
        (filter === 'archived' && !p.is_active) ||
        (filter === 'low' &&
          p.is_active &&
          p.track_inventory &&
          (stock.get(p.id)?.onHand || 0) - (stock.get(p.id)?.reserved || 0) <= p.min_stock_level)),
  );
  function startEdit(product?: Product) {
    setEditing(product);
    setForm(
      product
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
        : blank(),
    );
    setFormError('');
    setShowForm(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      if (!form.sku.trim() || !form.product_name.trim())
        throw new Error('SKU and product name are required.');
      if (
        [form.unit_price, form.cost_price, form.vat_rate, form.min_stock_level].some(
          (v) => !Number.isFinite(v) || v < 0,
        ) ||
        form.vat_rate > 100 ||
        !Number.isInteger(form.min_stock_level)
      )
        throw new Error('Check pricing, VAT (0–100) and whole minimum stock.');
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
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save product.');
    } finally {
      setBusy(false);
    }
  }
  async function archive(product: Product) {
    setBusy(true);
    setError('');
    try {
      if (product.is_active) await archiveProduct(product.id);
      else await updateProduct(product.id, { is_active: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change product status.');
    } finally {
      setBusy(false);
    }
  }
  function startReceipt(product: Product) {
    setReceiving(product);
    setWarehouse(warehouses[0]?.id || '');
    setQuantity(1);
    setReference('');
    setRequestId(crypto.randomUUID());
    setFormError('');
  }
  async function receive(event: FormEvent) {
    event.preventDefault();
    if (!receiving) return;
    setBusy(true);
    setFormError('');
    try {
      await receiveBusinessStock(
        companyId,
        receiving.id,
        warehouse,
        quantity,
        reference,
        requestId,
      );
      setReceiving(undefined);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not receive stock.');
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    downloadBusinessCsv(
      'inventory.csv',
      recordsToCsv(
        [
          'SKU',
          'Product',
          'Warehouse on-hand total',
          'Reserved',
          'Sellable',
          'Cost',
          'Price',
          'VAT rate',
          'Active',
        ],
        rows.map((p) => {
          const s = stock.get(p.id) || { onHand: 0, reserved: 0 };
          return [
            p.sku,
            p.product_name,
            s.onHand,
            s.reserved,
            s.onHand - s.reserved,
            p.cost_price,
            p.unit_price,
            p.vat_rate,
            p.is_active,
          ];
        }),
      ),
    );
  }
  return (
    <section className="space-y-6 text-slate-900 dark:text-white">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Products and inventory</h1>
          <p className="mt-2 text-slate-500">
            Manage catalog items and receive stock into company warehouses with an audit trail and
            accounting entry at catalog cost.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded border p-2"
            onClick={() => void load()}
            disabled={loading || busy}
          >
            Refresh
          </button>
          <button className="rounded border p-2" onClick={exportCsv} disabled={loading || !!error}>
            Export CSV
          </button>
          <button
            className="rounded bg-blue-600 p-2 text-white"
            onClick={() => startEdit()}
            disabled={loading || !!error || busy}
          >
            New product
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded bg-red-50 p-4 text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <input
          className="min-w-64 flex-1 rounded border bg-transparent p-3"
          aria-label="Search products"
          placeholder="Search product, SKU or barcode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border bg-transparent p-3"
          aria-label="Filter products"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['all', 'active', 'archived', 'low'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {[
                'SKU / product',
                'On hand',
                'Reserved',
                'Sellable',
                'Cost / price',
                'Status',
                'Actions',
              ].map((h) => (
                <th className="p-4 text-start" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => {
              const s = stock.get(product.id) || { onHand: 0, reserved: 0 };
              return (
                <tr className="border-t" key={product.id}>
                  <td className="p-4">
                    {product.sku}
                    <p className="font-semibold">{product.product_name}</p>
                  </td>
                  <td className="p-4">{s.onHand}</td>
                  <td className="p-4">{s.reserved}</td>
                  <td className="p-4">{s.onHand - s.reserved}</td>
                  <td className="p-4">
                    {Number(product.cost_price).toFixed(2)} /{' '}
                    {Number(product.unit_price).toFixed(2)}
                  </td>
                  <td className="p-4">{product.is_active ? 'Active' : 'Archived'}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded border p-2"
                        disabled={busy}
                        onClick={() => startEdit(product)}
                      >
                        Edit
                      </button>
                      {product.is_active && product.track_inventory && (
                        <button
                          className="rounded border p-2"
                          disabled={busy}
                          onClick={() => startReceipt(product)}
                        >
                          Receive stock
                        </button>
                      )}
                      <button
                        className="rounded border p-2"
                        disabled={busy}
                        onClick={() => void archive(product)}
                      >
                        {product.is_active ? 'Archive' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  {loading
                    ? 'Loading inventory…'
                    : error
                      ? 'Inventory unavailable.'
                      : 'No saved products match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 dark:bg-slate-900"
          >
            <h2 id="product-title" className="mb-4 text-xl font-bold">
              {editing ? 'Edit product' : 'New product'}
            </h2>
            <form onSubmit={save} className="space-y-4">
              {formError && (
                <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
                  {formError}
                </p>
              )}
              <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
                {(['sku', 'product_name', 'barcode', 'unit_of_measure'] as const).map((key) => (
                  <label key={key}>
                    {key.replaceAll('_', ' ')}
                    <input
                      className={inputClass}
                      required={key === 'sku' || key === 'product_name'}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </label>
                ))}
                {(['unit_price', 'cost_price', 'vat_rate', 'min_stock_level'] as const).map(
                  (key) => (
                    <label key={key}>
                      {key.replaceAll('_', ' ')}
                      <input
                        className={inputClass}
                        type="number"
                        step={key === 'min_stock_level' ? '1' : '0.01'}
                        min="0"
                        max={key === 'vat_rate' ? 100 : undefined}
                        required
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                      />
                    </label>
                  ),
                )}
                <label>
                  Product type
                  <select
                    className={inputClass}
                    value={form.product_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        product_type: e.target.value as CreateProductInput['product_type'],
                      })
                    }
                  >
                    {['GOODS', 'SERVICE', 'ASSET'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.track_inventory}
                    onChange={(e) => setForm({ ...form, track_inventory: e.target.checked })}
                  />{' '}
                  Track stock
                </label>
                <label className="sm:col-span-2">
                  Description
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>
              </fieldset>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded border px-4 py-2"
                  disabled={busy}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Save product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {receiving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="receive-title"
            className="w-full max-w-xl rounded-xl bg-white p-6 dark:bg-slate-900"
          >
            <h2 id="receive-title" className="text-xl font-bold">
              Receive {receiving.product_name}
            </h2>
            <p className="my-3 text-sm text-slate-500">
              Cost: {Number(receiving.cost_price).toFixed(2)} per unit. The receipt debits inventory
              and credits goods receipt clearing; record the supplier invoice separately.
            </p>
            <form onSubmit={receive} className="space-y-4">
              {formError && (
                <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
                  {formError}
                </p>
              )}
              <label className="block">
                Warehouse
                <select
                  className={inputClass}
                  required
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              {!warehouses.length && (
                <p className="text-amber-700">
                  Create an active company warehouse before receiving stock.
                </p>
              )}
              <label className="block">
                Quantity
                <input
                  className={inputClass}
                  type="number"
                  step="1"
                  min="1"
                  max="1000000"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
              <label className="block">
                Supplier delivery / receipt reference
                <input
                  className={inputClass}
                  required
                  maxLength={250}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded border px-4 py-2"
                  disabled={busy}
                  onClick={() => setReceiving(undefined)}
                >
                  Cancel
                </button>
                <button
                  className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                  disabled={busy || !warehouses.length}
                >
                  {busy ? 'Saving…' : 'Receive and post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
