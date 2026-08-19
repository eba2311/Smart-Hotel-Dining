import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { orderApi } from '../lib/api.js';
import { fmtMoney, fmtDateTime } from '../lib/format.js';
import { Spinner, Button } from '../components/ui.jsx';

export default function ReceiptPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    orderApi.get(orderId)
      .then((res) => setOrder(res.data))
      .catch((e) => setError(e.message || 'Order not found'));
  }, [orderId]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="font-bold text-lg mb-2">Receipt Not Found</p>
        <p className="text-sm text-slate-500">{error}</p>
        <button onClick={() => window.close()} className="mt-4 text-brand-600 font-semibold text-sm">Close tab</button>
      </div>
    </div>
  );

  if (!order) return <Spinner label="Loading receipt..." />;

  const loc = order.table ? `Table ${order.table?.number}` : order.room ? `Room ${order.room?.number}` : 'Takeaway';

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={16} /> Back
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800">
            <Printer size={16} /> Print
          </button>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <p className="text-2xl font-black tracking-tight">Smart Hotel</p>
            <p className="text-sm text-slate-500">Dining &amp; Service</p>
            <p className="text-xs text-slate-400 mt-1">INVOICE / RECEIPT</p>
          </div>

          <div className="border-t border-dashed border-slate-300" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Order Number</p>
              <p className="font-bold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Date &amp; Time</p>
              <p className="font-bold">{fmtDateTime(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Location</p>
              <p className="font-bold">{loc}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Payment</p>
              <p className="font-bold capitalize">{order.paymentMethod}</p>
            </div>
            {order.customerName && (
              <div className="col-span-2">
                <p className="text-slate-400 text-xs">Customer</p>
                <p className="font-bold">{order.customerName}</p>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-slate-300" />

          <div>
            <p className="text-xs text-slate-400 font-semibold mb-2 uppercase">Items Ordered</p>
            <div className="space-y-2">
              {(order.items || []).map((it, idx) => (
                <div key={idx} className="flex items-start justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-semibold">{it.name} <span className="font-normal text-slate-400">× {it.quantity}</span></p>
                    {it.options?.length > 0 && (
                      <p className="text-xs text-slate-400">
                        {it.options.map((o) => `${o.name}: ${o.choices.map((c) => c.label).join(', ')}`).join(' | ')}
                      </p>
                    )}
                    {it.note && <p className="text-xs text-amber-500">Note: {it.note}</p>}
                  </div>
                  <span className="font-semibold shrink-0 ml-3">{fmtMoney(it.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300" />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmtMoney(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtMoney(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{fmtMoney(order.tax)}</span></div>
            <div className="flex justify-between font-black text-lg pt-1 border-t border-slate-200">
              <span>TOTAL</span>
              <span className="text-brand-700">{fmtMoney(order.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Payment Status</span>
              <span className={`font-semibold capitalize ${order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{order.paymentStatus}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300" />

          <div className="text-center space-y-1">
            <p className="text-xs text-slate-400">Thank you for dining with us!</p>
            <p className="text-xs text-slate-400">Smart Hotel Dining — Quality &amp; Excellence</p>
            <p className="text-[10px] text-slate-300 mt-2">Generated {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
