import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, Landmark, Banknote, Tag, Users, Percent, Sparkles, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { orderApi, catalogApi, couponApi } from '../lib/api.js';
import { guestId, fmtMoney } from '../lib/format.js';
import { Button, Input } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DishImage from '../components/DishImage.jsx';
import { clsx } from 'clsx';

const METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote, desc: 'Pay at counter or in room' },
  { key: 'card', label: 'Card', icon: CreditCard, desc: 'Visa, Mastercard, etc.' },
  { key: 'mobile_money', label: 'Mobile Money', icon: Smartphone, desc: 'Telebirr, M-Pesa, etc.' },
  { key: 'bank', label: 'Bank Transfer', icon: Landmark, desc: 'Direct bank transfer' },
];

const TIP_PRESETS = [0, 10, 15, 20, 25];

function UpsellSuggestions({ branch, cartItemIds, onAdd }) {
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (!branch || cartItemIds.length === 0) return;
    catalogApi.coOrdered(branch, cartItemIds[0])
      .then((res) => setSuggestions(res.data.filter((s) => !cartItemIds.includes(s._id)).slice(0, 4)))
      .catch(() => {});
  }, [branch, cartItemIds]);
  if (suggestions.length === 0) return null;
  return (
    <div className="card p-4 border-amber-200 bg-gradient-to-r from-amber-50 to-white">
      <p className="font-bold text-sm text-amber-800 flex items-center gap-2 mb-3">
        <Sparkles size={14} /> Customers also ordered
      </p>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <div key={s._id} className="flex items-center gap-3 p-2 rounded-xl bg-white border border-amber-100">
            <DishImage src={s.image} alt={s.name} size="w-10 h-10" textSize="text-lg" rounded="rounded-lg" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs">{s.name}</p>
              <p className="text-[10px] text-slate-400">{s.category} · {s.orderCount}x ordered</p>
            </div>
            <p className="text-xs font-bold text-amber-700 shrink-0">{fmtMoney(s.price)}</p>
            <button onClick={() => onAdd(s)} className="p-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors active:scale-90">
              <Plus size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitBillPanel({ total, items }) {
  const [mode, setMode] = useState('equal');
  const [people, setPeople] = useState(2);
  const [selected, setSelected] = useState(() => new Set(items.map((_, i) => i)));

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((_, i) => { if (!next.has(i)) next.add(i); });
      return next;
    });
  }, [items.length]);

  const toggleItem = (idx) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const perPerson = useMemo(() => {
    if (mode === 'equal') return people > 0 ? total / people : total;
    const selectedTotal = items.reduce((sum, item, idx) => selected.has(idx) ? sum + item.unitPrice * item.qty : sum, 0);
    return people > 0 ? selectedTotal / people : selectedTotal;
  }, [mode, people, total, items, selected]);

  const selectedTotal = useMemo(() => {
    if (mode === 'equal') return total;
    return items.reduce((sum, item, idx) => selected.has(idx) ? sum + item.unitPrice * item.qty : sum, 0);
  }, [mode, items, selected, total]);

  return (
    <div className="card p-5">
      <p className="font-bold mb-3 flex items-center gap-2"><Users size={16} className="text-brand-600" /> Split Bill</p>
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode('equal')} className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all', mode === 'equal' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>Equal Split</button>
        <button onClick={() => setMode('custom')} className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all', mode === 'custom' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>By Items</button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-slate-500">People:</span>
        <button onClick={() => setPeople(Math.max(2, people - 1))} className="w-8 h-8 rounded-full bg-slate-100 font-bold text-lg flex items-center justify-center hover:bg-slate-200">-</button>
        <span className="font-bold text-lg w-8 text-center">{people}</span>
        <button onClick={() => setPeople(Math.min(20, people + 1))} className="w-8 h-8 rounded-full bg-slate-100 font-bold text-lg flex items-center justify-center hover:bg-slate-200">+</button>
      </div>
      {mode === 'custom' && (
        <div className="max-h-40 overflow-y-auto mb-3 space-y-1 scrollbar-none">
          {items.map((item, idx) => (
            <button key={idx} onClick={() => toggleItem(idx)}
              className={clsx('w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all', selected.has(idx) ? 'bg-brand-50 border border-brand-200' : 'bg-slate-50 border border-slate-200 opacity-50')}>
              <span className="truncate">{item.qty}x {item.menuItem.name}</span>
              <span className="font-semibold">{fmtMoney(item.unitPrice * item.qty)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="bg-brand-50 rounded-xl p-4 text-center border border-brand-200">
        <p className="text-xs text-slate-500 mb-1">Split {people} way{people > 1 ? 's' : ''} ({mode === 'equal' ? 'equal' : 'selected items'})</p>
        <p className="text-2xl font-black text-brand-700">{fmtMoney(perPerson)}</p>
        <p className="text-[10px] text-slate-400 mt-1">per person · total split: {fmtMoney(selectedTotal)}</p>
      </div>
    </div>
  );
}

function TipCalculator({ subtotal, onTipChange }) {
  const [tipPercent, setTipPercent] = useState(15);
  const [customTip, setCustomTip] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const tipAmount = useMemo(() => {
    if (showCustom) return Number(customTip) || 0;
    return subtotal * (tipPercent / 100);
  }, [subtotal, tipPercent, customTip, showCustom]);

  useEffect(() => { onTipChange(tipAmount); }, [tipAmount, onTipChange]);

  return (
    <div className="card p-5">
      <p className="font-bold mb-3 flex items-center gap-2"><Percent size={16} className="text-brand-600" /> Add a Tip</p>
      <div className="flex gap-2 mb-3 flex-wrap">
        {TIP_PRESETS.map((p) => (
          <button key={p} onClick={() => { setTipPercent(p); setShowCustom(false); }}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              !showCustom && tipPercent === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>
            {p === 0 ? 'No tip' : `${p}%`}
          </button>
        ))}
        <button onClick={() => setShowCustom(true)}
          className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            showCustom ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-slate-500">ETB</span>
          <input type="number" min="0" className="input w-24" value={customTip} onChange={(e) => setCustomTip(e.target.value)} placeholder="0" />
        </div>
      )}
      {tipAmount > 0 && (
        <p className="text-xs text-slate-500">Tip: <span className="font-bold text-emerald-600">{fmtMoney(tipAmount)}</span></p>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { branch, items, clear, subtotal, addItem } = useCart();
  const toast = useToast();
  const [name, setName] = useState('');
  const [method, setMethod] = useState('cash');
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tip, setTip] = useState(0);
  const [showSplit, setShowSplit] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    setCouponMsg('');
    try {
      const res = await couponApi.validate(coupon.trim(), branch, subtotal);
      setDiscount(res.data.discount);
      setCouponMsg(res.data.message);
    } catch (err) {
      setDiscount(0);
      setCouponMsg(err.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon('');
    setDiscount(0);
    setCouponMsg('');
  };

  const tax = (subtotal - discount) * 0.15;
  const total = subtotal - discount + tax + tip;

  const cartItemIds = useMemo(() => items.map((i) => i.menuItem?._id).filter(Boolean), [items]);

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
        tip,
        idempotencyKey: crypto.randomUUID(),
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-slate-50 dark:from-neutral-950 dark:to-neutral-900">
        <div className="text-6xl mb-4">🛒</div>
        <p className="font-bold text-xl mb-2">Your cart is empty</p>
        <p className="text-slate-500 text-sm mb-4">Add some delicious dishes first!</p>
        <Link to="/" className="btn-primary">Browse Menu</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50 dark:from-neutral-950 dark:to-neutral-900">
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
              <input className="input" placeholder="e.g. WELCOME10" value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponMsg(''); setDiscount(0); }} />
              {discount > 0 ? (
                <Button variant="outline" onClick={removeCoupon} className="!text-rose-600 !border-rose-300 hover:!bg-rose-50">
                  Remove
                </Button>
              ) : (
                <Button variant="outline" onClick={applyCoupon} loading={couponLoading}>
                  Apply
                </Button>
              )}
            </div>
            {couponMsg && (
              <p className={`text-xs mt-2 font-medium ${discount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {couponMsg}
              </p>
            )}
            {!couponMsg && (
              <p className="text-xs text-slate-400 mt-2">Enter your coupon code and click Apply for a discount preview.</p>
            )}
          </div>

          <button onClick={() => setShowSplit(!showSplit)} className="w-full card p-4 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.99]">
            <span className="flex items-center gap-2 font-semibold text-sm"><Users size={16} className="text-brand-600" /> Split Bill</span>
            <span className="text-xs text-slate-400">{showSplit ? 'Close' : 'Split between friends'}</span>
          </button>
          {showSplit && <SplitBillPanel total={subtotal - discount + tax} items={items} />}

          <button onClick={() => setShowTip(!showTip)} className="w-full card p-4 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.99]">
            <span className="flex items-center gap-2 font-semibold text-sm"><Percent size={16} className="text-brand-600" /> Add Tip</span>
            <span className="text-xs text-slate-400">{showTip ? 'Close' : 'Show your appreciation'}</span>
          </button>
          {showTip && <TipCalculator subtotal={subtotal - discount + tax} onTipChange={setTip} />}

          <UpsellSuggestions branch={branch} cartItemIds={cartItemIds} onAdd={(item) => addItem(item, 1, [], '')} />
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
              {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmtMoney(discount)}</span></div>}
              <div className="flex justify-between text-slate-500"><span>Tax (15%)</span><span>{fmtMoney(tax)}</span></div>
              {tip > 0 && <div className="flex justify-between text-emerald-600"><span>Tip</span><span>+{fmtMoney(tip)}</span></div>}
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
