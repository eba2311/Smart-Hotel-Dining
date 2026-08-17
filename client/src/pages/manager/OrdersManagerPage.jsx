import React, { useEffect, useState, useMemo } from 'react';
import { orderApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { Spinner, Empty, Select, Button, Modal } from '../../components/ui.jsx';
import { OrderStatusBadge } from '../../components/StatusBadge.jsx';
import DishImage from '../../components/DishImage.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtMoney, fmtDateTime, nextSteps } from '../../lib/format.js';
import { Search, WifiOff } from 'lucide-react';

const STATUS_ORDER = ['PAYMENT_PENDING', 'CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

export default function OrdersManagerPage() {
  const { branch, branches, setBranch } = useBranch();
  const { on, socket } = useSocket();
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!branch) return;
    const s = socket;
    if (s) s.emit('join-branch', branch);
    orderApi.list(branch).then((res) => setOrders(res.data)).catch(() => setOrders([]));
  }, [branch, socket]);

  useEffect(() => {
    if (!on) return;
    const offNew = on('order:new', (o) => {
      setOrders((prev) => (prev ? [o, ...prev] : prev));
      toast?.success(`New order ${o.orderNumber}`);
    });
    const offStatus = on('order:status', (o) => {
      setOrders((prev) => (prev ? prev.map((x) => (String(x._id) === String(o._id) ? o : x)) : prev));
      setSelected((prev) => (prev && String(prev._id) === String(o._id) ? o : prev));
    });
    return () => { offNew(); offStatus(); };
  }, [on, toast]);

  useEffect(() => { setPage(0); }, [filter, search]);

  const act = async (o, to) => {
    setBusy(`${o._id}-${to}`);
    try {
      const res = await orderApi.updateStatus(o._id, to);
      setSelected(res.data);
      toast?.success(`Order ${o.orderNumber} → ${to.replace(/_/g, ' ').toLowerCase()}`);
    } catch (e) { toast?.error(e.message); } finally { setBusy(null); }
  };

  const cancel = async (o) => {
    if (!confirm(`Cancel order ${o.orderNumber}?`)) return;
    setBusy(`${o._id}-cancel`);
    try {
      await orderApi.cancel(o._id, 'Cancelled by manager');
      toast?.success(`Order ${o.orderNumber} cancelled`);
      setSelected(null);
    } catch (e) { toast?.error(e.message); } finally { setBusy(null); }
  };

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o) => !filter || o.status === filter)
      .filter((o) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          String(o.table?.number).includes(q) ||
          String(o.room?.number).includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, filter, search]);

  const PAGE_SIZE = 25;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const statusCounts = useMemo(() => {
    if (!orders) return {};
    const counts = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  return (
    <DashboardLayout
      title="Orders"
      actions={
        <div className="flex gap-2">
          {!socket?.connected && <span className="text-xs text-rose-500 font-semibold flex items-center gap-1"><WifiOff size={14} /> Disconnected</span>}
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44">
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')} {statusCounts[s] ? `(${statusCounts[s]})` : ''}</option>
            ))}
          </Select>
        </div>
      }
    >
      {!orders ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="Search by order #, customer name, table, or room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <Empty icon="📦" title="No orders found" subtitle={search || filter ? 'Try different filters.' : 'Orders will appear here in real time.'} />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((o) => (
                    <tr key={o._id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(o)}>
                      <td className="px-4 py-3 font-bold">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{o.customerName || 'Guest'}</td>
                      <td className="px-4 py-3 text-slate-600">{o.table ? `Table ${o.table?.number}` : o.room ? `Room ${o.room?.number}` : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{o.items.reduce((s, i) => s + i.quantity, 0)} items</td>
                      <td className="px-4 py-3 font-semibold">{fmtMoney(o.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge capitalize text-[10px] ${o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : o.paymentStatus === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {o.paymentMethod} · {o.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDateTime(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" className="!py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); setSelected(o); }}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50 disabled:opacity-30">Prev</button>
              <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50 disabled:opacity-30">Next</button>
            </div>
          )}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.orderNumber} wide>
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 items-center">
              <OrderStatusBadge status={selected.status} />
              <span className="text-sm text-slate-500">Placed {fmtDateTime(selected.createdAt)} · {selected.customerName}</span>
            </div>

            <div>
              <p className="font-bold mb-2">Items</p>
              <div className="space-y-2">
                {selected.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <DishImage src={it.image} alt={it.name} size="w-9 h-9" textSize="text-base" />
                    <div className="flex-1">
                      <span className="font-medium">{it.name} × {it.quantity}</span>
                      {it.options?.length > 0 && (
                        <span className="block text-xs text-slate-400">
                          {it.options.map((op) => `${op.name}: ${op.choices.map((c) => c.label).join(', ')}`).join(' · ')}
                        </span>
                      )}
                      {it.note && <span className="block text-xs text-amber-500">📝 {it.note}</span>}
                    </div>
                    <span className="font-medium">{fmtMoney(it.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-3 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmtMoney(selected.subtotal)}</span></div>
                {selected.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtMoney(selected.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{fmtMoney(selected.tax)}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span className="text-brand-700">{fmtMoney(selected.total)}</span></div>
              </div>
            </div>

            {selected.status !== 'CANCELLED' && (
              <div>
                <p className="font-bold mb-2">Advance order</p>
                <div className="flex flex-wrap gap-2">
                  {(nextSteps(selected.status) || []).filter((s) => s !== 'CANCELLED').map((s) => (
                    <button key={s} onClick={() => act(selected, s)} disabled={busy === `${selected._id}-${s}`} className="btn-outline text-xs">
                      {busy === `${selected._id}-${s}` ? 'Updating...' : s.replace(/_/g, ' ')}
                    </button>
                  ))}
                  {(nextSteps(selected.status) || []).includes('CANCELLED') && (
                    <button onClick={() => cancel(selected)} disabled={!!busy} className="btn-danger text-xs">Cancel order</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
