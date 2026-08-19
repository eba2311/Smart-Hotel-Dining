import React, { useEffect, useMemo, useState, useRef } from 'react';
import { orderApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { Spinner, Empty } from '../components/ui.jsx';
import { OrderStatusBadge } from '../components/StatusBadge.jsx';
import DishImage from '../components/DishImage.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { clsx } from 'clsx';
import { Volume2, VolumeX } from 'lucide-react';

const ACTIVE = ['CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY'];

const ACTIONS = {
  CONFIRMED: { action: 'accept', label: '✅ Accept Order', color: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20' },
  KITCHEN_ACCEPTED: { action: 'start', label: '👨‍🍳 Start Prep', color: 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20' },
  PREPARING: { action: 'ready', label: '🔔 Mark Ready', color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' },
};

const STATUS_BORDER = {
  CONFIRMED: 'border-l-amber-500',
  KITCHEN_ACCEPTED: 'border-l-sky-500',
  PREPARING: 'border-l-violet-500',
  READY: 'border-l-emerald-500',
};

const STATUS_BG = {
  CONFIRMED: 'bg-amber-50',
  KITCHEN_ACCEPTED: 'bg-sky-50',
  PREPARING: 'bg-violet-50/50',
  READY: 'bg-emerald-50/50',
};

function elapsed(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function playNotif() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function Ticket({ o, busy, onAct }) {
  const action = ACTIONS[o.status];
  const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
  const urgent = mins > 15 && o.status !== 'READY';
  const warning = mins > 10 && o.status !== 'READY';

  return (
    <div className={clsx('card p-4 border-l-4 transition-all', STATUS_BORDER[o.status], STATUS_BG[o.status], urgent && 'ring-2 ring-rose-300 animate-pulse')}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-lg">{o.orderNumber}</p>
            {(urgent || warning) && (
              <span className={clsx('badge text-[10px]', urgent ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                ⏰ {elapsed(o.createdAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {o.table ? `Table ${o.table?.number}` : o.room ? `Room ${o.room?.number}` : o.deliveryLocation || 'Takeaway'}
            {o.deliveryLocation && (o.table || o.room) && <span className="font-semibold text-brand-600 ml-1">· {o.deliveryLocation}</span>}
            {o.customerName && o.customerName !== 'Guest' && <span className="text-slate-400 ml-1">· {o.customerName}</span>}
          </p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>
      <div className="space-y-2 mb-3">
        {(o.items || []).map((it, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <DishImage src={it.image} alt={it.name} size="w-8 h-8" textSize="text-sm" className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{it.name}</span>
              <span className="font-bold ml-1">×{it.quantity}</span>
              {it.options?.length > 0 && (
                <span className="block text-xs text-slate-400">
                  {it.options.map((op) => `${op.name}: ${op.choices.map((c) => c.label).join(', ')}`).join(' · ')}
                </span>
              )}
              {it.note && <span className="block text-xs text-amber-600 font-medium">📝 {it.note}</span>}
            </div>
          </div>
        ))}
      </div>
      {action && (
        <button
          onClick={() => onAct(o, action.action)}
          disabled={busy === o._id}
          className={clsx('w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-all shadow-lg active:scale-[0.98]', action.color)}
        >
          {busy === o._id ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Working...
            </span>
          ) : action.label}
        </button>
      )}
    </div>
  );
}

export default function KitchenDashboard() {
  const { user } = useAuth();
  const { on, socket } = useSocket();
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [tick, setTick] = useState(0);
  const prevCount = useRef(0);

  const branchId = user?.branch;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!branchId) return;
    const s = socket;
    if (s) s.emit('join-branch', branchId);
    orderApi.list(branchId).then((res) => {
      setOrders(res.data);
      prevCount.current = res.data.length;
    }).catch(() => setOrders([]));
  }, [branchId, socket]);

  useEffect(() => {
    if (!on) return;
    const offNew = on('order:new', (o) => {
      setOrders((prev) => {
        const next = prev ? [o, ...prev] : prev;
        if (prev && next.length > prevCount.current) {
          if (soundOn) playNotif();
          toast?.success(`New order ${o.orderNumber}!`);
        }
        prevCount.current = next?.length || 0;
        return next;
      });
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
  }, [on, soundOn, toast]);

  const active = useMemo(() => (orders || []).filter((o) => ACTIVE.includes(o.status)), [orders, tick]);
  const ready = active.filter((o) => o.status === 'READY');
  const cooking = active.filter((o) => o.status !== 'READY');

  const sortBy = (list) =>
    [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

  const act = async (o, action) => {
    setBusy(o._id);
    try {
      await orderApi.kitchen(o._id, action);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!branchId) return <Empty title="No branch assigned" subtitle="Contact an administrator to assign you to a branch." />;
  if (!orders) return <Spinner label="Loading kitchen orders..." />;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🍳 Kitchen Display
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-sm">
            <span className="badge bg-amber-100 text-amber-700">
              🔥 {cooking.length} cooking
            </span>
            <span className="badge bg-emerald-100 text-emerald-700">
              ✅ {ready.length} ready
            </span>
          </div>
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={clsx('p-2 rounded-lg transition-colors', soundOn ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500')}
            title={soundOn ? 'Mute notifications' : 'Enable notifications'}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {active.length === 0 ? (
        <Empty icon="🍳" title="Kitchen is clear" subtitle="New orders will appear here in real time." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortBy(cooking).map((o) => <Ticket key={o._id} o={o} busy={busy} onAct={act} />)}
          {sortBy(ready).map((o) => <Ticket key={o._id} o={o} busy={busy} onAct={act} />)}
        </div>
      )}
    </div>
  );
}
