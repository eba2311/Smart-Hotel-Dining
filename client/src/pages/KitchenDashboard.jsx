import React, { useEffect, useMemo, useState } from 'react';
import { orderApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { Spinner, Empty } from '../components/ui.jsx';
import DishImage from '../components/DishImage.jsx';
import { OrderStatusBadge } from '../components/StatusBadge.jsx';
import { clsx } from 'clsx';

const ACTIVE = ['CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY'];

const ACTIONS = {
  CONFIRMED: { action: 'accept', label: 'Accept', color: 'bg-sky-600 hover:bg-sky-700' },
  KITCHEN_ACCEPTED: { action: 'start', label: 'Start Prep', color: 'bg-violet-600 hover:bg-violet-700' },
  PREPARING: { action: 'ready', label: 'Mark Ready', color: 'bg-emerald-600 hover:bg-emerald-700' },
};

export default function KitchenDashboard() {
  const { user } = useAuth();
  const { joinBranch, on, socket } = useSocket();
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(null);

  const branchId = user?.branch;

  useEffect(() => {
    if (!branchId) return;
    const s = socket;
    if (s) s.emit('join-branch', branchId);
    orderApi.list(branchId).then((res) => setOrders(res.data)).catch(() => setOrders([]));
  }, [branchId, socket]);

  useEffect(() => {
    if (!on) return;
    const offNew = on('order:new', (o) => {
      setOrders((prev) => (prev ? [o, ...prev] : prev));
    });
    const offStatus = on('order:status', (o) => {
      setOrders((prev) =>
        prev
          ? prev
              .map((x) => (String(x._id) === String(o._id) ? o : x))
              .filter((x) => ACTIVE.includes(x.status))
          : prev
      );
    });
    return () => { offNew(); offStatus(); };
  }, [on]);

  const active = useMemo(() => (orders || []).filter((o) => ACTIVE.includes(o.status)), [orders]);
  const ready = active.filter((o) => o.status === 'READY');
  const cooking = active.filter((o) => o.status !== 'READY');

  const sortBy = (list) =>
    [...list].sort((a, b) => (a.priority - b.priority) || (a.status === 'CONFIRMED' ? -1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));

  const act = async (o, action) => {
    setBusy(o._id);
    try {
      await orderApi.kitchen(o._id, action);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!branchId) return <Empty title="No branch assigned" subtitle="Contact an administrator to assign you to a branch." />;
  if (!orders) return <Spinner label="Loading kitchen orders..." />;

  const Ticket = ({ o }) => {
    const action = ACTIONS[o.status];
    return (
      <div
        className={clsx(
          'card p-4 border-l-4',
          o.status === 'READY' ? 'border-l-emerald-500' : o.status === 'PREPARING' ? 'border-l-violet-500' : o.status === 'KITCHEN_ACCEPTED' ? 'border-l-sky-500' : 'border-l-amber-500'
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold text-lg">{o.orderNumber}</p>
            <p className="text-sm text-slate-500">
              {o.table ? `Table ${o.table?.number}` : o.room ? `Room ${o.room?.number}` : 'Takeaway'}
            </p>
          </div>
          <OrderStatusBadge status={o.status} />
        </div>
        <div className="space-y-1.5 mb-3">
          {o.items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-700">
                <DishImage src={it.image} alt={it.name} size="w-9 h-9" className="inline-block align-middle mr-1" textSize="text-base" /> {it.name} <span className="font-bold">× {it.quantity}</span>
                {it.options?.length > 0 && (
                  <span className="block text-xs text-slate-400">
                    {it.options.map((op) => `${op.name}: ${op.choices.map((c) => c.label).join(', ')}`).join(' · ')}
                  </span>
                )}
                {it.note && <span className="block text-xs text-amber-600">📝 {it.note}</span>}
              </span>
            </div>
          ))}
        </div>
        {action && (
          <button
            onClick={() => act(o, action.action)}
            disabled={busy === o._id}
            className={clsx('w-full py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50', action.color)}
          >
            {busy === o._id ? 'Working...' : action.label}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Kitchen Display System</h1>
        <div className="flex gap-2 text-sm">
          <span className="badge bg-amber-100 text-amber-700">{cooking.length} in progress</span>
          <span className="badge bg-emerald-100 text-emerald-700">{ready.length} ready</span>
        </div>
      </div>

      {active.length === 0 ? (
        <Empty icon="🍳" title="Kitchen is clear" subtitle="New orders will appear here in real time." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortBy(cooking).map((o) => <Ticket key={o._id} o={o} />)}
          {sortBy(ready).map((o) => <Ticket key={o._id} o={o} />)}
        </div>
      )}
    </div>
  );
}
