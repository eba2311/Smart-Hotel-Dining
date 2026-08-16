import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart, Plus, Minus, Search, Sparkles, UserRound, Bell,
} from 'lucide-react';
import { catalogApi, serviceApi, analyticsApi } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { guestId, fmtMoney, SERVICE_TYPE_LABEL, SERVICE_TYPE_ICON } from '../lib/format.js';
import { Modal, Button, Badge, Spinner, Textarea } from '../components/ui.jsx';
import DishImage from '../components/DishImage.jsx';

function ItemModal({ item, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState({});
  const [note, setNote] = useState('');

  const toggleChoice = (opt, choiceId) => {
    setSelected((prev) => {
      const cur = prev[opt.id] || [];
      if (opt.type === 'single') return { ...prev, [opt.id]: [choiceId] };
      return {
        ...prev,
        [opt.id]: cur.includes(choiceId) ? cur.filter((c) => c !== choiceId) : [...cur, choiceId],
      };
    });
  };

  const delta = (item.options || []).reduce((sum, opt) => {
    return (
      sum +
      (selected[opt.id] || []).reduce((s, cid) => {
        const c = opt.choices.find((c2) => c2.id === cid);
        return s + (c?.priceDelta || 0);
      }, 0)
    );
  }, 0);

  const canAdd =
    !(item.options || []).some((opt) => opt.required && (selected[opt.id] || []).length === 0);

  const add = () => {
    if (!canAdd) return;
    onAdd(
      qty,
      (item.options || [])
        .filter((opt) => (selected[opt.id] || []).length > 0)
        .map((opt) => ({ optionId: opt.id, choiceIds: selected[opt.id] })),
      note
    );
  };

  return (
    <Modal open onClose={onClose} title={item.name}>
      <div className="space-y-5">
        <div className="flex gap-4">
          <DishImage src={item.image} alt={item.name} size="w-36 h-36" rounded="rounded-2xl" textSize="text-6xl" />
          <div>
            <p className="text-slate-600 text-sm">{item.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.allergens?.map((a) => (
                <Badge key={a} className="bg-amber-100 text-amber-700">⚠️ {a}</Badge>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              🔥 {item.calories} kcal · ⏱ {item.prepTimeMinutes} min
            </p>
          </div>
        </div>

        {(item.options || []).map((opt) => (
          <div key={opt.id} className="border border-slate-200 rounded-xl p-4">
            <p className="font-semibold text-sm">
              {opt.name}
              {opt.required && <span className="text-rose-500"> *</span>}
            </p>
            <div className="mt-2 space-y-2">
              {opt.choices.map((c) => {
                const active = (selected[opt.id] || []).includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                      active ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={opt.type === 'single' ? 'radio' : 'checkbox'}
                        name={opt.id}
                        checked={active}
                        onChange={() => toggleChoice(opt, c.id)}
                        className="accent-brand-600"
                      />
                      {c.label}
                    </span>
                    {c.priceDelta > 0 && <span className="text-brand-600 font-medium">+{fmtMoney(c.priceDelta)}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <Textarea label="Special instructions (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. no onions, extra spicy..." />

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded-xl border border-slate-300 flex items-center justify-center">
              <Minus size={16} />
            </button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Plus size={16} />
            </button>
          </div>
          <Button onClick={add} disabled={!canAdd}>
            Add · {fmtMoney((item.price + delta) * qty)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ServicePanel({ ctx }) {
  const [form, setForm] = useState({ type: '', note: '' });
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.type) return;
    setBusy(true);
    try {
      await serviceApi.create({
        branch: ctx.branch._id,
        room: ctx.kind === 'room' ? ctx.id : undefined,
        table: ctx.kind === 'table' ? ctx.id : undefined,
        guestName: ctx.label,
        customerId: guestId(),
        type: form.type,
        note: form.note,
      });
      setSent(form.type);
      setForm({ type: '', note: '' });
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">✅</div>
        <p className="font-bold">Request sent!</p>
        <p className="text-sm text-slate-500 mt-1">Our team has been notified in real time.</p>
        <Button variant="outline" className="mt-4" onClick={() => setSent(null)}>Request another</Button>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(SERVICE_TYPE_LABEL).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setForm((f) => ({ ...f, type: key }))}
            className={`p-4 rounded-xl border text-left transition-colors ${
              form.type === key ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <span className="text-2xl">{SERVICE_TYPE_ICON[key]}</span>
            <p className="font-semibold text-sm mt-1">{label}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Add details (optional)" />
        <Button className="w-full" onClick={submit} disabled={!form.type || busy}>
          Submit Request
        </Button>
      </div>
    </div>
  );
}

export default function GuestMenuPage() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const { items, addItem, updateQty, removeItem, subtotal, count, setBranch } = useCart();
  const socket = useSocket();

  const [ctx, setCtx] = useState(null);
  const [menu, setMenu] = useState(null);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [tab, setTab] = useState('order');
  const [reco, setReco] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: ctxData } = await catalogApi.resolveQr(qrToken);
        setCtx(ctxData);
        setBranch(ctxData.branch._id);
        const menuRes = await catalogApi.menu(ctxData.branch._id);
        setMenu(menuRes.data);
      } catch (err) {
        setError(err.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    })();
  }, [qrToken, navigate, setBranch]);

  useEffect(() => {
    if (!ctx) return;
    const s = socket?.socket;
    if (s) {
      s.emit('join-guest', guestId());
    }
  }, [ctx, socket]);

  useEffect(() => {
    if (!ctx) return;
    const ids = items.map((i) => i.menuItem._id).join(',');
    analyticsApi
      .recommendations(ctx.branch._id, guestId(), ids)
      .then((res) => setReco(res.data))
      .catch(() => {});
  }, [ctx, items]);

  const filtered = useMemo(() => {
    if (!menu) return [];
    let list = menu.items;
    if (activeCat !== 'all') list = list.filter((i) => String(i.category?._id) === String(activeCat));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return list;
  }, [menu, activeCat, search]);

  const addToCart = useCallback(
    (item) => {
      setSelectedItem(item);
    },
    []
  );

  const handleAdd = useCallback(
    (qty, options, note) => {
      addItem(selectedItem, qty, options, note);
      setSelectedItem(null);
      setCartOpen(true);
    },
    [addItem, selectedItem]
  );

  if (loading) return <Spinner label="Opening menu..." />;
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50 flex items-center justify-center p-6">
        <div className="card p-6 max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-bold text-lg">Couldn't open the menu</p>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <div className="text-xs text-slate-400 mt-4 space-y-1 text-left">
            <p>Make sure:</p>
            <p>1. The API server is running on port 5000</p>
            <p>2. MongoDB service is running (port 27017)</p>
            <p>3. The QR code link is valid</p>
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={() => { setError(null); setLoading(true); window.location.reload(); }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  if (!ctx || !menu) return <Spinner />;

  const inCart = (id) => items.find((i) => String(i.menuItem._id) === String(id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50 pb-32">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white sticky top-0 z-30 shadow-xl shadow-brand-900/20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏨</span>
              <div>
                <h1 className="font-bold leading-tight">{ctx.branchName}</h1>
                <p className="text-xs text-brand-200">
                  {ctx.kind === 'room' ? 'Room ' : 'Table '}
                  <span className="font-bold text-white">{ctx.number}</span>
                  {ctx.kind === 'room' && ' · Room Service'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <button onClick={() => navigate(`/history/${guestId()}`)} className="p-2 rounded-full hover:bg-brand-800">
                <UserRound size={20} />
              </button>
            )}
            <button onClick={() => setCartOpen(true)} className="relative p-2 rounded-full hover:bg-brand-800">
              <ShoppingCart size={22} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-4 flex gap-2">
        <button
          onClick={() => setTab('order')}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'order' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border'}`}
        >
          Order Food
        </button>
        {ctx.kind === 'room' && (
          <button
            onClick={() => setTab('service')}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'service' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
            <Bell size={14} className="inline mr-1" />
            Room Services
          </button>
        )}
      </div>

      {tab === 'service' ? (
        <div className="max-w-5xl mx-auto px-4">
          <ServicePanel ctx={ctx} />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4">
          {/* Search */}
          <div className="relative mt-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10 rounded-full"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto py-4 -mx-4 px-4">
            <button
              onClick={() => setActiveCat('all')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium ${activeCat === 'all' ? 'bg-slate-900 text-white' : 'bg-white border'}`}
            >
              All
            </button>
            {menu.categories.map((c) => (
              <button
                key={c._id}
                onClick={() => setActiveCat(c._id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium ${activeCat === c._id ? 'bg-slate-900 text-white' : 'bg-white border'}`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          {/* Recommendations */}
          {reco.length > 0 && activeCat === 'all' && !search && (
            <div className="card p-4 mb-6 border-brand-200 bg-gradient-to-r from-brand-50 to-white">
              <p className="font-bold text-brand-800 flex items-center gap-2 mb-3">
                <Sparkles size={16} /> AI Picks for You
              </p>
              <div className="space-y-2">
                {reco.slice(0, 3).map((r) => (
                  <button
                    key={r.menuItem._id}
                    onClick={() => addToCart(r.menuItem)}
                    className="w-full flex items-center gap-3 text-left rounded-xl border border-brand-100 bg-white p-2.5 hover:border-brand-300 transition-colors"
                  >
                    <DishImage src={r.menuItem.image} alt={r.menuItem.name} size="w-16 h-16" textSize="text-3xl" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{r.menuItem.name}</p>
                      <p className="text-xs text-slate-400 truncate">{r.reason}</p>
                    </div>
                    <span className="text-brand-700 font-bold text-sm">{fmtMoney(r.menuItem.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-16">No dishes match your search.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filtered.map((item) => (
                <button
                  key={item._id}
                  onClick={() => addToCart(item)}
                  className="card p-0 overflow-hidden text-left hover:shadow-md transition-shadow group"
                >
                  <DishImage
                    src={item.image}
                    alt={item.name}
                    size="w-full h-96"
                    rounded="rounded-none"
                    textSize="text-8xl"
                  />
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xl font-bold">{item.name}</p>
                      {item.special && <Badge className="bg-accent-100 text-accent-600 shrink-0">SPECIAL</Badge>}
                    </div>
                    <p className="text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        {item.originalPrice && (
                          <span className="text-slate-400 line-through mr-1">{fmtMoney(item.originalPrice)}</span>
                        )}
                        <span className="text-xl font-bold text-brand-700">{fmtMoney(item.price)}</span>
                      </div>
                      {inCart(item._id) ? (
                        <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                          <Plus size={14} /> {inCart(item._id).qty} in cart
                        </span>
                      ) : (
                        <span className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus size={20} />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item modal */}
      {selectedItem && (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={handleAdd} />
      )}

      {/* Cart drawer */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title={`Your Order (${count} items)`}>
        {items.length === 0 ? (
          <p className="text-center text-slate-400 py-10">Your cart is empty.</p>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.key} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                <DishImage src={i.menuItem.image} alt={i.menuItem.name} size="w-16 h-16" textSize="text-3xl" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{i.menuItem.name}</p>
                  {i.optionsLabel?.length > 0 && (
                    <p className="text-xs text-slate-400 truncate">{i.optionsLabel.join(' · ')}</p>
                  )}
                  <p className="text-xs text-brand-700 font-semibold">{fmtMoney(i.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(i.key, i.qty - 1)} className="w-7 h-7 rounded-lg border flex items-center justify-center">
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                  <button onClick={() => updateQty(i.key, i.qty + 1)} className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                    <Plus size={13} />
                  </button>
                </div>
                <button onClick={() => removeItem(i.key)} className="text-rose-400 text-xs font-semibold">Remove</button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="font-bold">Subtotal</p>
              <p className="font-bold text-brand-700">{fmtMoney(subtotal)}</p>
            </div>
            <Button className="w-full" onClick={() => { setCartOpen(false); navigate('/checkout'); }}>
              Proceed to Checkout →
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
