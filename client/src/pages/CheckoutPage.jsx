import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, Landmark, Banknote, Tag, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { orderApi } from '../lib/api.js';
import { guestId, fmtMoney } from '../lib/format.js';
import { Button, Input } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { clsx } from 'clsx';

const METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote, desc: 'Pay at counter or in room' },
  { key: 'card', label: 'Card', icon: CreditCard, desc: 'Visa, Mastercard, etc.' },
  { key: 'mobile_money', label: 'Mobile Money', icon: Smartphone, desc: 'Telebirr, M-Pesa, etc.' },
  { key: 'bank', label: 'Bank Transfer', icon: Landmark, desc: 'Direct bank transfer' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { branch, items, clear, subtotal } = useCart();
  const toast = useToast();
  const [name, setName] = useState('');
  const [method, setMethod] = useState('cash');
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const discount = 0;
  const tax = (subtotal - discount) * 0.15;
  const total = subtotal - discount + tax;

  const placeOrder = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        branch,
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
      toast?.success('Order placed successfully!');
      clear();
      navigate(`/track/${res.data.order._id}`);
    } catch (err) {
      setError(err.message);
      toast?.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = items.length > 0 && !loading;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="text-6xl mb-4">🛒</div>
        <p className="font-bold text-xl mb-2">Your cart is empty</p>
        <p className="text-slate-500 text-sm mb-4">Add some delicious dishes first!</p>
        <Link to="/" className="btn-primary">Browse Menu</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <header className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-brand-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold">Checkout</h1>
          <span className="ml-auto badge bg-white/20 text-white text-xs">{items.length} items</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 space-y-5">
          <div className="card p-5">
            <p className="font-bold mb-3">Your Details</p>
            <Input
              label="Name (for the order)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
            />
          </div>

          <div className="card p-5">
            <p className="font-bold mb-3">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={clsx(
                    'p-4 rounded-xl border text-left transition-all active:scale-[0.98]',
                    method === key ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10' : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                >
                  <Icon size={20} className={method === key ? 'text-brand-600' : 'text-slate-400'} />
                  <p className="font-semibold text-sm mt-1">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="font-bold mb-3 flex items-center gap-2"><Tag size={16} className="text-brand-600" /> Coupon Code</p>
            <div className="flex gap-2">
              <input className="input" placeholder="e.g. WELCOME10" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
              <Button variant="outline" onClick={() => toast?.info('Coupon validated on order placement')}>
                Apply
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Enter your coupon code. It will be validated when you place the order.</p>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="card p-5 sticky top-20">
            <p className="font-bold mb-4">Order Summary</p>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {items.map((i) => (
                <div key={i.key} className="flex justify-between text-sm gap-2">
                  <span className="text-slate-600 truncate">{i.qty}x {i.menuItem.name}</span>
                  <span className="font-medium shrink-0">{fmtMoney(i.unitPrice * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-4 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Tax (15%)</span><span>{fmtMoney(tax)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-100">
                <span>Total</span>
                <span className="text-brand-700">{fmtMoney(total)}</span>
              </div>
            </div>
            {error && (
              <div className="text-sm text-rose-500 bg-rose-50 rounded-xl px-3 py-2 mt-3 border border-rose-200">
                {error}
              </div>
            )}
            <Button className="w-full mt-4" onClick={placeOrder} loading={loading} disabled={!canSubmit}>
              {method === 'cash' ? 'Place Order' : `Pay ${fmtMoney(total)}`}
            </Button>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Prices verified server-side. Payment is simulated in demo mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
