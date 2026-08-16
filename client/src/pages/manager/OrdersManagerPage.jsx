import React, { useEffect, useState } from 'react';
import { orderApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { Spinner, Empty, Select, Button, Modal } from '../../components/ui.jsx';
import { OrderStatusBadge } from '../../components/StatusBadge.jsx';
import DishImage from '../../components/DishImage.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { fmtMoney, fmtDateTime, nextSteps } from '../../lib/format.js';

const STATUS_ORDER = ['PAYMENT_PENDING', 'CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

export default function OrdersManagerPage() {
  const { branch, branches, setBranch } = useBranch();
  const { on, socket, joinBranch } = useSocket();
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!branch) return;
    const s = socket;
    if (s) s.emit('join-branch', branch);
    orderApi.list(branch).then((res) => setOrders(res.data)).catch(() => setOrders([]));
  }, [branch, socket]);

  useEffect(() => {
    if (!on) return;
    const offNew = on('order:new', (o) => setOrders((prev) => (prev ? [o, ...prev] : prev)));
    const offStatus = on('order:status', (o) =>
      setOrders((prev) => (prev ? prev.map((x) => (String(x._id) === String(o._id) ? o : x)) : prev))
    );
    return () => { offNew(); offStatus(); };
  }, [on]);

  const act = async (o, to) => {
    setBusy(`${o._id}-${to}`);
    try {
      const res = await orderApi.updateStatus(o._id, to);
      setSelected(res.data);
    } catch (e) { alert(e.message); } finally { setBusy(null); }
  };

  const cancel = async (o) => {
    if (!confirm(`Cancel order ${o.orderNumber}?`)) return;
    setBusy(`${o._id}-cancel`);
    try {
      await orderApi.cancel(o._id, 'Cancelled by manager');
    } catch (e) { alert(e.message); } finally { setBusy(null); }
  };

  const filtered = orders
    ? orders
        .filter((o) => !filter || o.status === filter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  return (
    <DashboardLayout
      title="Orders"
      actions={
        <div className="flex gap-2">
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44">
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
      }
    >
      {!orders ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty icon="📦" title="No orders found" subtitle="Orders will appear here in real time." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3">Order</th>
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
              {filtered.slice(0, 60).map((o) => (
                <tr key={o._id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{o.table ? `Table ${o.table?.number}` : o.room ? `Room ${o.room?.number}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.items.reduce((s, i) => s + i.quantity, 0)} items</td>
                  <td className="px-4 py-3 font-semibold">{fmtMoney(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : o.paymentStatus === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {o.paymentMethod} · {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button variant="outline" className="!py-1.5 text-xs" onClick={() => setSelected(o)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  <div key={i} className="flex justify-between text-sm">
                    <span><DishImage src={it.image} alt={it.name} size="w-9 h-9" className="inline-block align-middle mr-1" textSize="text-base" /> {it.name} × {it.quantity}</span>
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
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                  {(nextSteps(selected.status) || []).includes('CANCELLED') && (
                    <button onClick={() => cancel(selected)} className="btn-danger text-xs">Cancel order</button>
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
