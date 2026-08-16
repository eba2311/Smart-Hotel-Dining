import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../lib/api.js';
import { fmtMoney, fmtDateTime } from '../lib/format.js';
import { Spinner, Empty } from '../components/ui.jsx';
import { OrderStatusBadge } from '../components/StatusBadge.jsx';

export default function OrderHistoryPage() {
  const { customerId } = useParams();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    orderApi.history(customerId).then((res) => setOrders(res.data)).catch(() => setOrders([]));
  }, [customerId]);

  if (!orders) return <Spinner label="Loading history..." />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="font-bold">My Orders</h1>
          <Link to="/" className="text-xs text-brand-200 hover:underline">← Back to menu</Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <Empty icon="🍽️" title="No orders yet" subtitle="Scan a table or room QR code to get started." />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o._id} to={`/track/${o._id}`} className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="font-bold">{o.orderNumber}</p>
                  <p className="text-xs text-slate-400">{fmtDateTime(o.createdAt)} · {o.items.length} item{o.items.length > 1 ? 's' : ''}</p>
                  <p className="text-sm mt-1 text-slate-500">
                    {o.items.slice(0, 2).map((i) => i.name).join(', ')}
                    {o.items.length > 2 && ` +${o.items.length - 2} more`}
                  </p>
                </div>
                <div className="text-right space-y-1.5">
                  <OrderStatusBadge status={o.status} />
                  <p className="font-bold text-brand-700">{fmtMoney(o.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
