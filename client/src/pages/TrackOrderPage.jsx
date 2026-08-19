import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Clock, MapPin, FileText, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { orderApi, reviewApi } from '../lib/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { fmtMoney, fmtTime, fmtDateTime, guestId } from '../lib/format.js';
import { Spinner, Button } from '../components/ui.jsx';
import OrderStatusTimeline from '../components/OrderStatusTimeline.jsx';
import { OrderStatusBadge } from '../components/StatusBadge.jsx';
import DishImage from '../components/DishImage.jsx';

const ETA = { CONFIRMED: 15, KITCHEN_ACCEPTED: 12, PREPARING: 8, READY: 2, OUT_FOR_DELIVERY: 1 };

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { on, socket, joinOrder, leaveOrder } = useSocket();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [kitchenLoad, setKitchenLoad] = useState(null);
  const [quickRating, setQuickRating] = useState(null);
  const [quickSent, setQuickSent] = useState(false);
  const [smartEta, setSmartEta] = useState(null);

  const playStatusSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    orderApi.get(orderId).then((res) => setOrder(res.data)).catch((e) => setError(e.message));
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    orderApi.smartEta(orderId).then((res) => setSmartEta(res.data)).catch(() => {});
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !socket) return;
    joinOrder(orderId, guestId());
    const off = on?.('order:status', (u) => {
      if (String(u._id) === String(orderId)) {
        const prev = order?.status;
        setOrder(u);
        if (prev && prev !== u.status) {
          playStatusSound();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Order Update', {
              body: `Order ${u.orderNumber} is now ${u.status.replace(/_/g, ' ').toLowerCase()}`,
              icon: '/favicon.ico',
            });
          }
        }
      }
    });
    return () => { off?.(); leaveOrder(orderId); };
  }, [orderId, on, socket, joinOrder, leaveOrder]);

  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    try { const res = await orderApi.cancel(orderId, 'Cancelled by customer', guestId()); setOrder(res.data); }
    catch (e) { setError(e.message); }
  };

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-3">😕</div>
      <p className="font-bold">{error}</p>
      <Link to="/" className="text-brand-600 font-semibold mt-2">Back to menu</Link>
    </div>
  );

  if (!order) return <Spinner label="Loading your order..." />;

  const cancellable = ['CREATED', 'PAYMENT_PENDING', 'CONFIRMED', 'KITCHEN_ACCEPTED'].includes(order.status);
  const eta = ETA[order.status];
  const locBase = order.table ? `Table ${order.table?.number}` : order.room ? `Room ${order.room?.number}` : order.deliveryLocation || 'Takeaway';
  const loc = (order.deliveryLocation && (order.table || order.room)) ? `${locBase} · ${order.deliveryLocation}` : locBase;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50 dark:from-neutral-950 dark:to-neutral-900">
      <header className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-brand-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="font-bold">Order {order.orderNumber}</h1>
            <p className="text-xs text-brand-200 flex items-center gap-1 justify-center"><MapPin size={12} />{loc}</p>
          </div>
          <Link to="/" className="p-2 rounded-full hover:bg-brand-800 transition-colors"><Home size={20} /></Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {eta > 0 && order.status !== 'CANCELLED' && (
          <div className="card p-4 bg-gradient-to-r from-brand-50 to-sky-50 border-brand-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center">
                <Clock size={22} className="text-brand-600 animate-pulse" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Estimated time remaining</p>
                <p className="text-2xl font-black text-brand-700">~{smartEta?.estimatedMinutes || eta} min</p>
                {smartEta && (
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                    <span>Prep: ~{smartEta.basePrepMinutes} min</span>
                    {smartEta.queuePosition > 0 && <span>· Queue: #{smartEta.queuePosition + 1}</span>}
                    <span>· Based on {smartEta.historicalOrders} orders</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 bg-white rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(10, 100 - ((smartEta?.estimatedMinutes || eta) / 20 * 100))}%` }} />
            </div>
          </div>
        )}

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <OrderStatusBadge status={order.status} />
            <p className="text-sm text-slate-400">Placed at {fmtTime(order.createdAt)}</p>
          </div>
          <OrderStatusTimeline status={order.status} />
          {order.status === 'CANCELLED' && (
            <p className="text-sm text-rose-500 mt-4 bg-rose-50 rounded-xl px-4 py-3 border border-rose-200">
              This order was cancelled. {order.cancelledReason && `Reason: ${order.cancelledReason}`}
            </p>
          )}
          {cancellable && (
            <button onClick={cancel} className="mt-4 text-sm text-rose-500 font-semibold hover:underline">Cancel order</button>
          )}
        </div>

        <div className="card p-6">
          <p className="font-bold mb-4">Items</p>
          <div className="space-y-3">
            {(order.items || []).map((it, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <DishImage src={it.image} alt={it.name} size="w-16 h-16" textSize="text-3xl" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{it.name} x {it.quantity}</p>
                  {it.options?.length > 0 && (
                    <p className="text-xs text-slate-400 truncate">
                      {it.options.map((o) => `${o.name}: ${o.choices.map((c) => c.label).join(', ')}`).join(' | ')}
                    </p>
                  )}
                  {it.note && <p className="text-xs text-amber-500">Note: {it.note}</p>}
                </div>
                <span className="font-semibold text-sm shrink-0">{fmtMoney(it.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-4 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmtMoney(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtMoney(order.discount)}</span></div>}
            <div className="flex justify-between text-slate-500"><span>Tax</span><span>{fmtMoney(order.tax)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span className="text-brand-700">{fmtMoney(order.total)}</span></div>
            <div className="flex justify-between text-slate-500 pt-1">
              <span>Payment</span>
              <span className="capitalize">{order.paymentMethod} - <span className={order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{order.paymentStatus}</span></span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="font-bold mb-3">Progress</p>
          <div className="space-y-3">
            {(order.statusHistory || []).map((h, idx) => (
              <div key={idx} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${idx === order.statusHistory.length - 1 ? 'bg-brand-500 ring-4 ring-brand-100' : 'bg-slate-300'}`} />
                  {idx < order.statusHistory.length - 1 && <span className="w-0.5 flex-1 bg-slate-200 min-h-[16px]" />}
                </div>
                <div className="pb-2">
                  <p className="font-medium capitalize">{h.status.replace(/_/g, ' ').toLowerCase()}</p>
                  <p className="text-xs text-slate-400">{fmtTime(h.at)} {h.by && `- ${h.by}`}{h.note && ` - ${h.note}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {order.status === 'COMPLETED' && (
          <div className="space-y-3">
            <div className="card p-6 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <p className="font-bold text-lg mb-1">Order Complete!</p>
              <p className="text-sm text-slate-500 mb-4">Thank you for dining with us</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => window.open(`/receipt/${order._id}`, '_blank')}>
                  <FileText size={16} className="mr-1.5" /> View Receipt
                </Button>
                <Button onClick={() => navigate(`/feedback/${order._id}`)}>
                  <Star size={16} className="mr-1.5" /> Rate Experience
                </Button>
              </div>
            </div>
            {!quickSent && (
              <div className="card p-5">
                <p className="font-semibold text-sm mb-3 text-center">Quick rating — was everything good?</p>
                <div className="flex justify-center gap-4">
                  <button onClick={async () => {
                    try {
                      await reviewApi.quick({ order: order._id, branch: order.branch, quickRating: 5 });
                    } catch {}
                    setQuickSent(true);
                  }} className="flex flex-col items-center gap-1 p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all active:scale-95">
                    <ThumbsUp size={28} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-slate-500">Good</span>
                  </button>
                  <button onClick={async () => {
                    try {
                      await reviewApi.quick({ order: order._id, branch: order.branch, quickRating: 2 });
                    } catch {}
                    setQuickSent(true);
                  }} className="flex flex-col items-center gap-1 p-4 rounded-2xl border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50 transition-all active:scale-95">
                    <ThumbsDown size={28} className="text-rose-500" />
                    <span className="text-xs font-semibold text-slate-500">Not great</span>
                  </button>
                </div>
              </div>
            )}
            {quickSent && (
              <div className="card p-4 text-center bg-emerald-50 border-emerald-200">
                <p className="text-sm font-semibold text-emerald-700">Thanks for your feedback! 🙏</p>
              </div>
            )}
          </div>
        )}
        {order.status === 'DELIVERED' && (
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>Back to menu</Button>
        )}
      </div>
    </div>
  );
}
