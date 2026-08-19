import React, { useEffect, useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { inventoryApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { Button, Modal, Input, Select, Spinner, Empty, ProgressBar, Badge } from '../../components/ui.jsx';
import { fmtDateTime } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function InventoryPage() {
  const toast = useToast();
  const { branch, branches, setBranch } = useBranch();
  const [ingredients, setIngredients] = useState(null);
  const [tx, setTx] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'g', stock: 1000, lowStockThreshold: 200 });
  const [stockTarget, setStockTarget] = useState(null);
  const [stockValue, setStockValue] = useState(0);
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockQty, setRestockQty] = useState('');

  const load = () => {
    if (!branch) return;
    setIngredients(null);
    Promise.all([inventoryApi.list(branch), inventoryApi.transactions(branch)])
      .then(([i, t]) => { setIngredients(i.data); setTx(t.data); })
      .catch(() => { toast.error('Failed to load inventory'); setIngredients([]); });
  };

  useEffect(() => { load(); }, [branch]);

  const add = async () => {
    try {
      await inventoryApi.create({ ...form, branch, stock: Number(form.stock), lowStockThreshold: Number(form.lowStockThreshold) });
      setShowAdd(false);
      setForm({ name: '', unit: 'g', stock: 1000, lowStockThreshold: 200 });
      load();
    } catch (e) { toast.error(e.message || 'Failed to create ingredient'); }
  };

  const restock = (ing) => {
    setRestockTarget(ing);
    setRestockQty('');
  };

  const saveRestock = async () => {
    const qty = Number(restockQty);
    if (!qty || qty <= 0) return toast.error('Quantity must be greater than 0');
    try {
      await inventoryApi.restock(restockTarget._id, qty, branch);
      toast.success('Stock restocked');
      setRestockTarget(null);
      load();
    } catch (e) { toast.error(e.message || 'Failed to restock ingredient'); }
  };

  const adjust = async (ing) => {
    setStockTarget(ing);
    setStockValue(ing.stock);
  };

  const saveAdjust = async () => {
    try {
      await inventoryApi.adjust(stockTarget._id, Number(stockValue), branch);
      toast.success('Stock adjusted');
      setStockTarget(null);
      load();
    } catch (e) { toast.error(e.message || 'Failed to adjust stock'); }
  };

  if (!ingredients) return <DashboardLayout title="Inventory"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout
      title="Inventory"
      actions={
        <>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">Select branch...</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Ingredient</Button>
        </>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3">Ingredient</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 w-56">Stock level</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const pct = Math.min(100, (ing.stock / Math.max(1, ing.lowStockThreshold * 3)) * 100);
                  const low = ing.stock <= ing.lowStockThreshold;
                  return (
                    <tr key={ing._id} className="border-b border-slate-50">
                      <td className="px-4 py-3 font-medium">{ing.name}</td>
                      <td className="px-4 py-3 text-slate-500">{ing.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1"><ProgressBar value={pct} color={low ? 'bg-rose-500' : 'bg-emerald-500'} /></div>
                          <span className="text-xs font-semibold w-20 text-right">{ing.stock} {ing.unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={low ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>
                          {low ? `⚠ LOW (${ing.lowStockThreshold} ${ing.unit})` : 'OK'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <Button variant="outline" className="!py-1.5 text-xs" onClick={() => restock(ing)}><TrendingUp size={13} /> Restock</Button>
                          <Button variant="outline" className="!py-1.5 text-xs" onClick={() => adjust(ing)}>Adjust</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="font-bold mb-3">Recent Transactions</p>
            {tx.length === 0 ? (
              <Empty icon="📜" title="No transactions yet" />
            ) : (
              <div className="space-y-2.5">
                {tx.slice(0, 12).map((t) => (
                  <div key={t._id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{t.ingredient?.name || 'Ingredient'}</p>
                      <p className="text-xs text-slate-400">{t.reason} · {fmtDateTime(t.createdAt)}</p>
                    </div>
                    <span className={`font-bold ${t.type === 'out' ? 'text-rose-500' : t.type === 'in' ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {t.type === 'out' ? '−' : t.type === 'in' ? '+' : '±'}{t.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Ingredient">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {['g', 'ml', 'unit', 'kg', 'L'].map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Input label="Initial stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <Input label="Low stock threshold" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
          <Button className="w-full" onClick={add}>Create</Button>
        </div>
      </Modal>

      <Modal open={!!stockTarget} onClose={() => setStockTarget(null)} title={`Adjust ${stockTarget?.name}`}>
        <div className="space-y-4">
          <Input label="New stock level" type="number" value={stockValue} onChange={(e) => setStockValue(e.target.value)} />
          <Button className="w-full" onClick={saveAdjust}>Save</Button>
        </div>
      </Modal>

      <Modal open={!!restockTarget} onClose={() => setRestockTarget(null)} title={`Restock ${restockTarget?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Current stock: {restockTarget?.stock} {restockTarget?.unit}</p>
          <Input label="Quantity to add" type="number" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} placeholder="0" />
          <Button className="w-full" onClick={saveRestock} loading={false}>Add Stock</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
