import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, RefreshCw, FileText } from 'lucide-react';
import { orderApi } from '../lib/api.js';
import { fmtMoney, fmtDateTime } from '../lib/format.js';
import { Spinner, Empty, Button } from '../components/ui.jsx';
import { OrderStatusBadge } from '../components/StatusBadge.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function OrderHistoryPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);
  const [loyalty, setLoyalty] = useState(null);
  const { addItem } = useCart();
  const toast = useToast();

  const quickReorder = async (order) => {
    try {
      const res = await orderApi.get(order._id);
      const fullOrder = res.data;
      fullOrder.items.forEach((item) => {
        const price = item.quantity > 0 ? item.subtotal / item.quantity : item.unitPrice || 0;
        addItem(
          { _id: item.menuItem?._id || item.menuItem, name: item.name, image: item.image, price, options: [] },
          item.quantity,
          [],
          item.note || ''
        );
      });
      toast.success(`Added ${fullOrder.items.length} items to cart`);
    } catch (e) { toast.error('Failed to reorder'); }
  };

  const stats = useMemo(() => {
    if (!orders) return { total: 0, spent: 0, items: 0 };
    return {
      total: orders.length,
      spent: orders.reduce((s, o) => s + (o.total || 0), 0),
      items: orders.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0), 0),
    };
  }, [orders]);

  const loyaltyPoints = Math.floor(stats.spent / 100);

  useEffect(() => {
    setFetching(true);
    setError('');
    orderApi.history(customerId)
      .then((res) => setOrders(res.data))
      .catch((e) => setError(e.message || 'Failed to load order history'))
      .finally(() => setFetching(false));
    orderApi.loyalty(customerId)
      .then((res) => setLoyalty(res.data))
      .catch(() => {});
  }, [customerId]);

  if (fetching) return <Spinner label="Loading history..." />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="text-xl font-bold mb-1">Something went wrong</h1>
          <p className="text-sm text-slate-500 mb-5">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950">
      <header className="bg-brand-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-brand-800">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold">My Orders</h1>
            <Link to="/" className="text-xs text-brand-200 hover:underline">← Back to menu</Link>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <Empty icon="🍽️" title="No orders yet" subtitle="Scan a table or room QR code to get started." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="card p-3 text-center">
                <p className="text-2xl font-black text-brand-700">{stats.total}</p>
                <p className="text-xs text-slate-400">Total Orders</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-2xl font-black text-emerald-600">{fmtMoney(stats.spent)}</p>
                <p className="text-xs text-slate-400">Total Spent</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-2xl font-black text-sky-600">{stats.items}</p>
                <p className="text-xs text-slate-400">Items Ordered</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-2xl font-black text-amber-500">⭐ {loyalty?.points ?? loyaltyPoints}</p>
                <p className="text-xs text-slate-400">Loyalty Points</p>
                {loyalty?.tier && <p className="text-[10px] font-semibold text-amber-600 mt-0.5">{loyalty.tier} Member</p>}
              </div>
            </div>
            <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o._id} to={`/track/${o._id}`} className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow group">
                <div>
                  <p className="font-bold group-hover:text-brand-600 transition-colors">{o.orderNumber}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> {fmtDateTime(o.createdAt)} · {(o.items || []).length} item{(o.items || []).length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm mt-1 text-slate-500">
                    {(o.items || []).slice(0, 2).map((i) => i.name).join(', ')}
                    {(o.items || []).length > 2 && ` +${(o.items || []).length - 2} more`}
                  </p>
                </div>
                <div className="text-right space-y-1.5">
                  <OrderStatusBadge status={o.status} />
                  {o.status === 'COMPLETED' && (
                    <button onClick={(e) => { e.preventDefault(); quickReorder(o); }}
                      className="mt-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 justify-end">
                      <RefreshCw size={12} /> Reorder
                    </button>
                  )}
                  {o.status === 'COMPLETED' && (
                    <button onClick={(e) => { e.preventDefault(); window.open(`/receipt/${o._id}`, '_blank'); }}
                      className="mt-1 text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 justify-end">
                      <FileText size={12} /> Receipt
                    </button>
                  )}
                  <p className="font-bold text-brand-700">{fmtMoney(o.total)}</p>
                </div>
              </Link>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
