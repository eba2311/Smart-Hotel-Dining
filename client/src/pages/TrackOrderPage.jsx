import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { orderApi } from '../lib/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { fmtMoney, fmtTime } from '../lib/format.js';
import { Spinner, Button } from '../components/ui.jsx';
import OrderStatusTimeline from '../components/OrderStatusTimeline.jsx';
import { OrderStatusBadge } from '../components/StatusBadge.jsx';
import DishImage from '../components/DishImage.jsx';

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { joinOrder, on, socket } = useSocket();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    orderApi
      .get(orderId)
      .then((res) => setOrder(res.data))
      .catch((e) => setError(e.message));
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const s = socket;
    if (s) s.emit('join-order', orderId);
    const off = on?.('order:status', (updated) => {
      if (String(updated._id) === String(orderId)) setOrder(updated);
    });
    return off;
  }, [orderId, on, socket]);

  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    try {
      const res = await orderApi.cancel(orderId, 'Cancelled by customer');
      setOrder(res.data);
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-3">😕</div>
        <p className="font-bold">{error}</p>
        <Link to="/" className="text-brand-600 font-semibold mt-2">Back to menu</Link>
      </div>
    );
  }

  if (!order) return <Spinner label="Loading your order..." />;

  const cancellable = ['CREATED', 'PAYMENT_PENDING', 'CONFIRMED'].includes(order.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-brand-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold">Order {order.orderNumber}</h1>
          <Link to="/" className="p-2 rounded-full hover:bg-brand-800" title="Home">
            <Home size={20} />
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <OrderStatusBadge status={order.status} />
            <p className="text-sm text-slate-400">Placed at {fmtTime(order.createdAt)}</p>
          </div>
          <OrderStatusTimeline status={order.status} />
          {order.status === 'CANCELLED' && (
            <p className="text-sm text-rose-500 mt-4 bg-rose-50 rounded-lg px-3 py-2">
              This order was cancelled. {order.cancelledReason && `Reason: ${order.cancelledReason}`}
            </p>
          )}
          {cancellable && (
            <button onClick={cancel} className="mt-4 text-sm text-rose-500 font-semibold hover:underline">
              Cancel order
            </button>
          )}
        </div>

        <div className="card p-6">
          <p className="font-bold mb-4">Items</p>
          <div className="space-y-3">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <DishImage src={it.image} alt={it.name} size="w-20 h-20" textSize="text-4xl" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{it.name} × {it.quantity}</p>
                  {it.options?.length > 0 && (
                    <p className="text-xs text-slate-400">
                      {it.options.map((o) => `${o.name}: ${o.choices.map((c) => c.label).join(', ')}`).join(' · ')}
                    </p>
                  )}
                  {it.note && <p className="text-xs text-slate-400">📝 {it.note}</p>}
                </div>
                <span className="font-semibold text-sm">{fmtMoney(it.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-4 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmtMoney(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtMoney(order.discount)}</span></div>}
            <div className="flex justify-between text-slate-500"><span>Tax</span><span>{fmtMoney(order.tax)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span><span className="text-brand-700">{fmtMoney(order.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500 pt-1">
              <span>Payment</span>
              <span className="capitalize">
                {order.paymentMethod} · <span className={order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{order.paymentStatus}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="font-bold mb-3">Progress</p>
          <div className="space-y-2.5">
            {order.statusHistory.map((h, idx) => (
              <div key={idx} className="flex gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium capitalize">{h.status.replace(/_/g, ' ').toLowerCase()}</p>
                  <p className="text-xs text-slate-400">{fmtTime(h.at)} · {h.by}{h.note && ` — ${h.note}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {order.status === 'COMPLETED' && (
          <Button className="w-full" onClick={() => navigate(`/feedback/${order._id}`)}>
            ⭐ Rate your experience
          </Button>
        )}
        {order.status === 'DELIVERED' && (
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>Back to menu</Button>
        )}
      </div>
    </div>
  );
}
