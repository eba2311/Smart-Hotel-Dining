import React, { useEffect, useMemo, useState } from 'react';
import { orderApi, serviceApi, tableApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { Spinner, Empty, Badge } from '../components/ui.jsx';
import { OrderStatusBadge, ServiceStatusBadge } from '../components/StatusBadge.jsx';
import DishImage from '../components/DishImage.jsx';
import { SERVICE_TYPE_LABEL, SERVICE_TYPE_ICON, fmtTime } from '../lib/format.js';
import { clsx } from 'clsx';

const WAITER_ORDERS = ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'];

export default function WaiterDashboard() {
  const { user } = useAuth();
  const { joinBranch, on, socket } = useSocket();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [requests, setRequests] = useState(null);
  const [tables, setTables] = useState([]);
  const [busy, setBusy] = useState(null);

  const branchId = user?.branch;

  useEffect(() => {
    if (!branchId) return;
    const s = socket;
    if (s) s.emit('join-branch', branchId);
    orderApi.list(branchId).then((res) => setOrders(res.data)).catch(() => setOrders([]));
    serviceApi.list(branchId).then((res) => setRequests(res.data)).catch(() => setRequests([]));
    tableApi.tables(branchId).then((res) => setTables(res.data)).catch(() => {});
  }, [branchId, socket]);

  useEffect(() => {
    if (!on) return;
    const offStatus = on('order:status', (o) => {
      setOrders((prev) =>
        prev
          ? prev.map((x) => (String(x._id) === String(o._id) ? o : x)).filter((x) => WAITER_ORDERS.includes(x.status))
          : prev
      );
    });
    const offReady = on('waiter:order-ready', (o) => {
      setOrders((prev) => (prev ? [o, ...prev.filter((x) => String(x._id) !== String(o._id))] : prev));
    });
    const offNewReq = on('service:new', (r) => {
      setRequests((prev) => (prev ? [r, ...prev] : prev));
    });
    const offUpdReq = on('service:update', (r) => {
      setRequests((prev) => (prev ? prev.map((x) => (String(x._id) === String(r._id) ? r : x)) : prev));
    });
    return () => { offStatus(); offReady(); offNewReq(); offUpdReq(); };
  }, [on]);

  const pendingRequests = useMemo(() => (requests || []).filter((r) => ['pending', 'accepted', 'processing'].includes(r.status)), [requests]);

  const deliver = async (o) => {
    setBusy(o._id);
    try {
      await orderApi.deliver(o._id);
    } catch (e) { alert(e.message); } finally { setBusy(null); }
  };

  const setOrderStatus = async (o, to) => {
    setBusy(o._id);
    try {
      await orderApi.updateStatus(o._id, to);
    } catch (e) { alert(e.message); } finally { setBusy(null); }
  };

  const setRequestStatus = async (r, status) => {
    setBusy(r._id);
    try {
      await serviceApi.update(r._id, { status });
    } catch (e) { alert(e.message); } finally { setBusy(null); }
  };

  if (!branchId) return <Empty title="No branch assigned" subtitle="Contact an administrator." />;
  if (!orders || !requests) return <Spinner label="Loading waiter dashboard..." />;

  const myOrders = orders.filter((o) => WAITER_ORDERS.includes(o.status)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Waiter Dashboard</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('orders')} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold', tab === 'orders' ? 'bg-brand-600 text-white' : 'bg-white border')}>
            Orders ({myOrders.filter((o) => o.status !== 'COMPLETED').length})
          </button>
          <button onClick={() => setTab('requests')} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold', tab === 'requests' ? 'bg-brand-600 text-white' : 'bg-white border')}>
            Service Requests ({pendingRequests.length})
          </button>
          <button onClick={() => setTab('tables')} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold', tab === 'tables' ? 'bg-brand-600 text-white' : 'bg-white border')}>
            Tables
          </button>
        </div>
      </div>

      {tab === 'orders' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {myOrders.length === 0 ? (
            <div className="md:col-span-3"><Empty icon="🛎️" title="No active deliveries" subtitle="Ready orders will appear here." /></div>
          ) : (
            myOrders.map((o) => (
              <div key={o._id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold">{o.orderNumber}</p>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="text-sm text-slate-500 mb-2">
                  {o.table ? `Table ${o.table?.number}` : o.room ? `Room ${o.room?.number}` : 'Takeaway'} · {fmtTime(o.createdAt)}
                </p>
                <div className="text-sm text-slate-600 space-y-0.5 mb-3">
                  {o.items.map((it, i) => (
                    <p key={i}><DishImage src={it.image} alt={it.name} size="w-9 h-9" className="inline-block align-middle mr-1" textSize="text-base" /> {it.name} × {it.quantity}</p>
                  ))}
                </div>
                <div className="flex gap-2">
                  {o.status === 'READY' && (
                    <button onClick={() => deliver(o)} disabled={busy === o._id} className="btn-primary flex-1 text-sm">
                      Deliver
                    </button>
                  )}
                  {o.status === 'OUT_FOR_DELIVERY' && (
                    <button onClick={() => setOrderStatus(o, 'DELIVERED')} disabled={busy === o._id} className="btn-primary flex-1 text-sm">
                      Mark Delivered
                    </button>
                  )}
                  {o.status === 'DELIVERED' && (
                    <button onClick={() => setOrderStatus(o, 'COMPLETED')} disabled={busy === o._id} className="btn-outline flex-1 text-sm">
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pendingRequests.length === 0 ? (
            <div className="md:col-span-3"><Empty icon="🔔" title="No pending requests" subtitle="Guest service requests will appear in real time." /></div>
          ) : (
            pendingRequests.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold flex items-center gap-2">
                    <span className="text-xl">{SERVICE_TYPE_ICON[r.type]}</span>
                    {SERVICE_TYPE_LABEL[r.type]}
                  </p>
                  <ServiceStatusBadge status={r.status} />
                </div>
                <p className="text-sm text-slate-500 mb-1">
                  {r.room ? `Room ${r.room?.number}` : r.table ? `Table ${r.table?.number}` : 'Guest'} · {fmtTime(r.createdAt)}
                </p>
                {r.note && <p className="text-sm text-slate-600 mb-2">📝 {r.note}</p>}
                <div className="flex gap-2">
                  {r.status === 'pending' && (
                    <button onClick={() => setRequestStatus(r, 'accepted')} disabled={busy === r._id} className="btn-primary flex-1 text-sm">
                      Accept
                    </button>
                  )}
                  {['accepted', 'processing'].includes(r.status) && (
                    <button onClick={() => setRequestStatus(r, 'completed')} disabled={busy === r._id} className="btn-outline flex-1 text-sm">
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'tables' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tables.map((t) => (
            <div key={t._id} className={clsx('card p-4', t.status === 'occupied' && 'bg-amber-50 border-amber-200')}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-lg">{t.label || `Table ${t.number}`}</p>
                <Badge className={clsx(t.status === 'available' ? 'bg-emerald-100 text-emerald-700' : t.status === 'occupied' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                  {t.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{t.seats} seats</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
