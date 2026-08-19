import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Ticket, Percent, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { couponApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { Button, Modal, Input, Select, Spinner, Empty, Badge } from '../../components/ui.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtDate, fmtMoney } from '../../lib/format.js';

const emptyForm = {
  code: '',
  type: 'percent',
  value: 10,
  minOrder: 0,
  maxUses: 100,
  expiresAt: '',
};

export default function CouponManagerPage() {
  const { branch, branches, setBranch } = useBranch();
  const [coupons, setCoupons] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  const load = () => {
    if (!branch) return;
    setCoupons(null);
    couponApi.list(branch)
      .then((res) => setCoupons(res.data))
      .catch(() => setCoupons([]));
  };

  useEffect(() => { load(); }, [branch]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        branch,
        value: Number(form.value),
        minOrder: Number(form.minOrder),
        maxUses: Number(form.maxUses),
        expiresAt: form.expiresAt || undefined,
      };
      if (editing) await couponApi.update(editing._id, payload);
      else await couponApi.create(payload);
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (c) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await couponApi.remove(c._id);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const toggleActive = async (c) => {
    try {
      await couponApi.update(c._id, { active: !c.active });
      load();
    } catch (e) { toast.error(e.message); }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder || 0,
      maxUses: c.maxUses || 100,
      expiresAt: c.expiresAt ? c.expiresAt.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const isExpired = (c) => {
    if (!c.expiresAt) return false;
    const exp = new Date(c.expiresAt);
    exp.setHours(23, 59, 59, 999);
    return exp < new Date();
  };
  const isUsedUp = (c) => c.maxUses > 0 && c.usedCount >= c.maxUses;

  const filtered = coupons
    ? coupons.filter((c) => {
        if (filter === 'active') return c.active && !isExpired(c) && !isUsedUp(c);
        if (filter === 'expired') return isExpired(c);
        if (filter === 'used') return isUsedUp(c);
        if (filter === 'inactive') return !c.active;
        return true;
      })
    : [];

  const stats = coupons
    ? {
        total: coupons.length,
        active: coupons.filter((c) => c.active && !isExpired(c) && !isUsedUp(c)).length,
        expired: coupons.filter((c) => isExpired(c)).length,
        totalRedemptions: coupons.reduce((sum, c) => sum + c.usedCount, 0),
      }
    : null;

  return (
    <DashboardLayout
      title="Coupon Management"
      actions={
        <>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">Select branch...</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Button onClick={openNew}><Plus size={16} /> New Coupon</Button>
        </>
      }
    >
      {!coupons ? (
        <Spinner />
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 flex items-center gap-3">
              <div className="rounded-xl p-3 bg-brand-50 text-brand-700"><Ticket size={20} /></div>
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="rounded-xl p-3 bg-emerald-50 text-emerald-700"><CheckCircle size={20} /></div>
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-xl font-bold">{stats.active}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="rounded-xl p-3 bg-amber-50 text-amber-700"><Clock size={20} /></div>
              <div>
                <p className="text-sm text-slate-500">Expired</p>
                <p className="text-xl font-bold">{stats.expired}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="rounded-xl p-3 bg-sky-50 text-sky-700"><DollarSign size={20} /></div>
              <div>
                <p className="text-sm text-slate-500">Redemptions</p>
                <p className="text-xl font-bold">{stats.totalRedemptions}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'expired', label: 'Expired' },
              { key: 'used', label: 'Used Up' },
              { key: 'inactive', label: 'Disabled' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Empty icon="🎟️" title="No coupons" subtitle="Create your first coupon to get started." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => {
                const expired = isExpired(c);
                const usedUp = isUsedUp(c);
                const pct = c.maxUses > 0 ? Math.round((c.usedCount / c.maxUses) * 100) : 0;
                return (
                  <div key={c._id} className={`card p-5 relative ${!c.active || expired || usedUp ? 'opacity-70' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono font-black text-brand-600 tracking-wider">
                          {c.code}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {c.active && !expired && !usedUp && (
                          <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                        )}
                        {expired && (
                          <Badge className="bg-amber-100 text-amber-700">Expired</Badge>
                        )}
                        {usedUp && !expired && (
                          <Badge className="bg-rose-100 text-rose-700">Used Up</Badge>
                        )}
                        {!c.active && !expired && !usedUp && (
                          <Badge className="bg-slate-100 text-slate-500">Disabled</Badge>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        {c.type === 'percent' ? (
                          <>
                            <span className="text-3xl font-black text-brand-700">{c.value}</span>
                            <Percent size={18} className="text-brand-500" />
                            <span className="text-sm text-slate-400">off</span>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-black text-brand-700">{c.value}</span>
                            <span className="text-sm text-slate-400">ETB off</span>
                          </>
                        )}
                      </div>
                      {c.minOrder > 0 && (
                        <p className="text-xs text-slate-400 mt-1">Min. order: {fmtMoney(c.minOrder)}</p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-slate-500 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Uses</span>
                        <span className="font-semibold">{c.usedCount} / {c.maxUses}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-brand-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      {c.expiresAt && (
                        <div className="flex items-center justify-between">
                          <span>Expires</span>
                          <span className={expired ? 'text-rose-500 font-semibold' : ''}>
                            {fmtDate(c.expiresAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 pt-3 border-t border-slate-100">
                      <Button variant="outline" className="!py-1.5 text-xs flex-1" onClick={() => openEdit(c)}>
                        <Pencil size={13} /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        className={`!py-1.5 text-xs ${c.active ? 'text-amber-600 hover:border-amber-400 hover:bg-amber-50' : 'text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50'}`}
                        onClick={() => toggleActive(c)}
                      >
                        {c.active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        className="!py-1.5 text-xs !text-rose-500 hover:!border-rose-400 hover:!bg-rose-50"
                        onClick={() => deleteCoupon(c)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Coupon' : 'New Coupon'}>
            <div className="space-y-4">
              <Input
                label="Coupon Code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="e.g. SUMMER20"
                className="uppercase tracking-wider font-mono"
              />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed Amount (ETB)</option>
                </Select>
                <Input
                  label={form.type === 'percent' ? 'Discount %' : 'Discount (ETB)'}
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <Input
                label="Minimum Order (ETB)"
                type="number"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Uses"
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                />
                <Input
                  label="Expiry Date"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={save} loading={saving}>
                {editing ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </DashboardLayout>
  );
}
