import React, { useEffect, useMemo, useState } from 'react';
import { orderApi, serviceApi, tableApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { Spinner, Empty, Badge } from '../components/ui.jsx';
import { OrderStatusBadge, ServiceStatusBadge } from '../components/StatusBadge.jsx';
import DishImage from '../components/DishImage.jsx';
import { SERVICE_TYPE_LABEL, SERVICE_TYPE_ICON, fmtTime } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { clsx } from 'clsx';

const WAITER_ORDERS = ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'];

function elapsed(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}

export default function WaiterDashboard() {
  const { user } = useAuth();
  const { on, socket } = useSocket();
  const toast = useToast();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [requests, setRequests] = useState(null);
  const [tables, setTables] = useState([]);
  const [busy, setBusy] = useState(null);
  const [tick, setTick] = useState(0);

  const branchId = user?.branch;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

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
      toast?.success(`Order ${o.orderNumber} is ready for delivery!`);
    });
    const offNewReq = on('service:new', (r) => {
      setRequests((prev) => (prev ? [r, ...prev] : prev));
      toast?.info(`New service request: ${SERVICE_TYPE_LABEL[r.type]}`);
    });
    const offUpdReq = on('service:update', (r) => {
      setRequests((prev) => (prev ? prev.map((x) => (String(x._id) === String(r._id) ? r : x)) : prev));
    });
    return () => { offStatus(); offReady(); offNewReq(); offUpdReq(); };
  }, [on, toast, socket]);

  const pendingRequests = useMemo(() => (requests || []).filter((r) => ['pending', 'accepted', 'processing'].includes(r.status)), [requests]);

  const deliver = async (o) => {
    setBusy(o._id);
    try {
      await orderApi.deliver(o._id);
      toast?.success(`Order ${o.orderNumber} marked for delivery`);
    } catch (e) { toast?.error(e.message); } finally { setBusy(null); }
  };

  const setOrderStatus = async (o, to) => {
    setBusy(o._id);
    try {
      await orderApi.updateStatus(o._id, to);
      toast?.success(`Order ${o.orderNumber} → ${to.replace(/_/g, ' ').toLowerCase()}`);
    } catch (e) { toast?.error(e.message); } finally { setBusy(null); }
  };

  const setRequestStatus = async (r, status) => {
    setBusy(r._id);
    try {
      await serviceApi.update(r._id, { status });
      toast?.success(`Request ${status}`);
    } catch (e) { toast?.error(e.message); } finally { setBusy(null); }
  };

  if (!branchId) return <Empty title="No branch assigned" subtitle="Contact an administrator." />;
  if (!orders || !requests) return <Spinner label="Loading waiter dashboard..." />;

  const myOrders = orders.filter((o) => WAITER_ORDERS.includes(o.status)).sort((a, b) => {
    if (a.status === 'READY' && b.status !== 'READY') return -1;
    if (b.status === 'READY' && a.status !== 'READY') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const freeTables = tables.filter((t) => t.status === 'available').length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">🍽️ Waiter Dashboard</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTab('orders')} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all relative', tab === 'orders' ? 'bg-brand-600 text-white shadow-md' : 'bg-white border')}>
            Orders
            {myOrders.filter((o) => o.status !== 'COMPLETED').length > 0 && (
              <span className="ml-1.5 badge bg-white/20 text-[10px]">{myOrders.filter((o) => o.status !== 'COMPLETED').length}</span>
            )}
          </button>
          <button onClick={() => setTab('requests')} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all relative', tab === 'requests' ? 'bg-brand-600 text-white shadow-md' : 'bg-white border')}>
            Service Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 badge bg-rose-500 text-white text-[10px] animate-pulse">{pendingRequests.length}</span>
            )}
          </button>
          <button onClick={() => setTab('tables')} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all', tab === 'tables' ? 'bg-brand-600 text-white shadow-md' : 'bg-white border')}>
            Tables ({freeTables}/{tables.length} free)
          </button>
        </div>
      </div>

      {tab === 'orders' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {myOrders.length === 0 ? (
            <div className="md:col-span-3"><Empty icon="🛎️" title="No active deliveries" subtitle="Ready orders will appear here." /></div>
          ) : (
            myOrders.map((o) => {
              const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
              return (
                <div key={o._id} className={clsx('card p-4', o.status === 'READY' && 'ring-2 ring-emerald-300')}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{o.orderNumber}</p>
                      {o.status === 'READY' && mins > 5 && (
                        <span className="badge bg-amber-100 text-amber-700 text-[10px]">⏰ {elapsed(o.createdAt)}</span>
                      )}
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    {o.table ? `Table ${o.table?.number}` : o.room ? `Room ${o.room?.number}` : o.deliveryLocation || 'Takeaway'}
                    {o.deliveryLocation && (o.table || o.room) && <span className="font-semibold text-brand-600 ml-1">· {o.deliveryLocation}</span>}
                    <span className="ml-1">· {fmtTime(o.createdAt)}</span>
                  </p>
                  <div className="text-sm text-slate-600 space-y-1 mb-3">
                    {(o.items || []).map((it, i) => (
                      <p key={i} className="flex items-center gap-1.5">
                        <DishImage src={it.image} alt={it.name} size="w-7 h-7" textSize="text-xs" />
                        <span className="flex-1">{it.name}</span>
                        <span className="font-bold">×{it.quantity}</span>
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {o.status === 'READY' && (
                      <button onClick={() => deliver(o)} disabled={busy === o._id} className="btn-primary flex-1 text-sm active:scale-[0.98]">
                        🚶 Deliver
                      </button>
                    )}
                    {o.status === 'OUT_FOR_DELIVERY' && (
                      <button onClick={() => setOrderStatus(o, 'DELIVERED')} disabled={busy === o._id} className="btn-primary flex-1 text-sm active:scale-[0.98]">
                        ✅ Mark Delivered
                      </button>
                    )}
                    {o.status === 'DELIVERED' && (
                      <button onClick={() => setOrderStatus(o, 'COMPLETED')} disabled={busy === o._id} className="btn-outline flex-1 text-sm">
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pendingRequests.length === 0 ? (
            <div className="md:col-span-3"><Empty icon="🔔" title="No pending requests" subtitle="Guest service requests will appear in real time." /></div>
          ) : (
            pendingRequests.map((r) => (
              <div key={r._id} className={clsx('card p-4', r.status === 'pending' && 'ring-2 ring-amber-300')}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold flex items-center gap-2">
                    <span className="text-xl">{SERVICE_TYPE_ICON[r.type]}</span>
                    {SERVICE_TYPE_LABEL[r.type]}
                  </p>
                  <ServiceStatusBadge status={r.status} />
                </div>
                <p className="text-sm text-slate-500 mb-1">
                  {r.room ? `Room ${r.room?.number}` : r.table ? `Table ${r.table?.number}` : 'Guest'} · {fmtTime(r.createdAt)}
                  {r.guestName && <span className="text-slate-400"> · {r.guestName}</span>}
                </p>
                {r.note && <p className="text-sm text-slate-600 mb-2 bg-slate-50 rounded-lg px-3 py-1.5">📝 {r.note}</p>}
                <div className="flex gap-2">
                  {r.status === 'pending' && (
                    <button onClick={() => setRequestStatus(r, 'accepted')} disabled={busy === r._id} className="btn-primary flex-1 text-sm active:scale-[0.98]">
                      ✅ Accept
                    </button>
                  )}
                  {['accepted', 'processing'].includes(r.status) && (
                    <button onClick={() => setRequestStatus(r, 'completed')} disabled={busy === r._id} className="btn-outline flex-1 text-sm">
                      ✓ Complete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'tables' && (
        <>
          <div className="flex gap-4 mb-4">
            <div className="card px-4 py-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium">{freeTables} Available</span>
            </div>
            <div className="card px-4 py-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm font-medium">{occupiedTables} Occupied</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tables.map((t) => (
              <div key={t._id} className={clsx(
                'card p-4 transition-all',
                t.status === 'occupied' && 'bg-amber-50 border-amber-200',
                t.status === 'available' && 'bg-emerald-50/30 border-emerald-100'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-lg">{t.label || `Table ${t.number}`}</p>
                  <Badge className={clsx(
                    'text-[10px]',
                    t.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                    t.status === 'occupied' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  )}>
                    {t.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">🪑 {t.seats} seats</p>
                {t.status === 'occupied' && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <p className="text-xs text-amber-600 font-medium">Guests seated</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
