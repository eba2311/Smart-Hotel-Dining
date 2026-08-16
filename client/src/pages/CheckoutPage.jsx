import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, Landmark, Banknote, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { orderApi } from '../lib/api.js';
import { guestId, fmtMoney } from '../lib/format.js';
import { Button, Input } from '../components/ui.jsx';
import { clsx } from 'clsx';

const METHODS = [
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { key: 'bank', label: 'Bank Transfer', icon: Landmark },
  { key: 'cash', label: 'Cash', icon: Banknote },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { branch, items, clear, subtotal } = useCart();
  const [name, setName] = useState('');
  const [method, setMethod] = useState('card');
  const [coupon, setCoupon] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const discount = couponInfo ? (couponInfo.type === 'percent' ? subtotal * (couponInfo.value / 100) : couponInfo.value) : 0;
  const tax = (subtotal - discount) * 0.15;
  const total = subtotal - discount + tax;

  const applyCoupon = () => {
    if (!coupon.trim()) return;
    // Server validates the coupon; here we let the server decide on submit.
    // For UX we just pass it along and let the server validate.
    setCouponInfo({ pending: true });
  };

  const placeOrder = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        branch: branch,
        customerId: guestId(),
        customerName: name.trim() || 'Guest',
        source: 'qr',
        paymentMethod: method,
        couponCode: coupon.trim() || undefined,
        items: items.map((i) => ({
          menuItem: i.menuItem._id,
          quantity: i.qty,
          options: i.options,
          note: i.note,
        })),
      };
      const res = await orderApi.create(payload);
      clear();
      navigate(`/track/${res.data.order._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = useMemo(() => items.length > 0, [items]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-5xl mb-3">🛒</div>
        <p className="font-bold text-lg">Your cart is empty</p>
        <Link to="/" className="text-brand-600 font-semibold mt-2">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-brand-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold">Checkout</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 space-y-5">
          <div className="card p-5">
            <p className="font-bold mb-3">Your Details</p>
            <Input label="Name (for the order)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="card p-5">
            <p className="font-bold mb-3">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={clsx(
                    'p-4 rounded-xl border text-left flex items-center gap-3 transition-colors',
                    method === key ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                >
                  <Icon size={20} className={method === key ? 'text-brand-600' : 'text-slate-400'} />
                  <span className="font-semibold text-sm">{label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              {method === 'cash' ? 'Pay at the counter or in your room.' : 'Pay securely online now.'}
            </p>
          </div>

          <div className="card p-5">
            <p className="font-bold mb-3 flex items-center gap-2"><Tag size={16} /> Coupon</p>
            <div className="flex gap-2">
              <input className="input" placeholder="e.g. WELCOME10" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <Button variant="outline" onClick={applyCoupon} disabled={!coupon.trim()}>Apply</Button>
            </div>
            {couponInfo?.pending && (
              <p className="text-xs text-slate-400 mt-2">Coupon is validated by the server when you place the order.</p>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="card p-5 sticky top-20">
            <p className="font-bold mb-4">Order Summary</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((i) => (
                <div key={i.key} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {i.qty}× {i.menuItem.name}
                  </span>
                  <span className="font-medium">{fmtMoney(i.unitPrice * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-4 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtMoney(discount)}</span></div>
              )}
              <div className="flex justify-between text-slate-500"><span>Tax (15%)</span><span>{fmtMoney(tax)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span className="text-brand-700">{fmtMoney(total)}</span></div>
            </div>
            {error && <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
            <Button className="w-full mt-4" onClick={placeOrder} loading={loading} disabled={!canSubmit}>
              {method === 'cash' ? 'Place Order' : `Pay ${fmtMoney(total)}`}
            </Button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Prices are verified server-side. Payment is simulated in demo mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
