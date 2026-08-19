import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Minus, Search, Sparkles, UserRound, Bell, Moon, Sun, Globe, Mic, MicOff, X,
} from 'lucide-react';
import { catalogApi, serviceApi, analyticsApi } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import useSmartSearch from '../hooks/useSmartSearch.js';
import { guestId, fmtMoney, SERVICE_TYPE_LABEL, SERVICE_TYPE_ICON } from '../lib/format.js';
import { Modal, Button, Badge, Spinner, Textarea } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DishImage from '../components/DishImage.jsx';

function ItemModal({ item, onClose, onAdd, chefPick }) {
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

  const hasPromo = item.promotionPrice && item.promotionPrice < item.price;
  const unitPrice = hasPromo ? item.promotionPrice : item.price;

  return (
    <Modal open onClose={onClose} title={item.name}>
      <div className="space-y-5">
        <div className="flex gap-4">
          <DishImage src={item.image} alt={item.name} size="w-36 h-36" rounded="rounded-2xl" textSize="text-6xl" />
          <div>
            {chefPick && <Badge className="mb-2 bg-amber-100 text-amber-700">🔥 Chef's pick today</Badge>}
            <p className="text-slate-600 text-sm">{item.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.allergens?.map((a) => (
                <Badge key={a} className="bg-amber-100 text-amber-700">⚠️ {a}</Badge>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              🔥 {item.calories} kcal · ⏱ {item.prepTimeMinutes} min
            </p>
            <div className="mt-2">
              {hasPromo ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-brand-700">{fmtMoney(item.promotionPrice)}</span>
                  <span className="text-sm text-slate-400 line-through">{fmtMoney(item.price)}</span>
                </div>
              ) : (
                <span className="text-xl font-bold text-brand-700">{fmtMoney(item.price)}</span>
              )}
            </div>
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
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded-xl border border-slate-300 flex items-center justify-center active:scale-95 transition-transform">
              <Minus size={16} />
            </button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform">
              <Plus size={16} />
            </button>
          </div>
          <Button onClick={add} disabled={!canAdd}>
            Add · {fmtMoney((unitPrice + delta) * qty)}
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
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.type) return;
    setBusy(true);
    setError('');
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
      setError(e.message || 'Failed to send request');
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
            className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] ${
              form.type === key ? 'border-brand-500 bg-brand-50 shadow-brand-glow' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <span className="text-2xl">{SERVICE_TYPE_ICON[key]}</span>
            <p className="font-semibold text-sm mt-1">{label}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {error && <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
        <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Add details (optional)" />
        <Button className="w-full" onClick={submit} disabled={!form.type || busy}>
          Submit Request
        </Button>
      </div>
    </div>
  );
}

function MenuCard({ item, inCart, onClick, dietary, popularity, chefPick }) {
  const hasPromo = item.promotionPrice && item.promotionPrice < item.price;

  return (
    <button
      onClick={onClick}
      className="card p-0 overflow-hidden text-left hover:shadow-md transition-all active:scale-[0.98] group"
    >
      <div className="relative">
        <DishImage
          src={item.image}
          alt={item.name}
          size="w-full h-48 sm:h-44"
          rounded="rounded-none"
          textSize="text-6xl"
          zoomable
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {popularity > 20 && <span className="badge bg-orange-500 text-white text-[10px] shadow-md">🔥 Popular</span>}
          {popularity > 10 && popularity <= 20 && <span className="badge bg-sky-500 text-white text-[10px] shadow-md">📈 Trending</span>}
          {chefPick && <span className="badge bg-amber-500 text-white text-[10px] shadow-md">🔥 Chef's pick</span>}
          {item.special && <span className="badge bg-accent-500 text-white text-[10px] shadow-md">✨ SPECIAL</span>}
        </div>
        {hasPromo && (
          <span className="absolute top-2 right-2 badge bg-rose-500 text-white text-[10px] shadow-md">
            -{Math.round((1 - item.promotionPrice / item.price) * 100)}%
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm leading-tight line-clamp-1">{item.name}</p>
        </div>
        <p className="text-slate-400 text-xs line-clamp-1 mt-0.5">{item.description}</p>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-baseline gap-1.5">
            {hasPromo ? (
              <>
                <span className="text-base font-bold text-brand-700">{fmtMoney(item.promotionPrice)}</span>
                <span className="text-xs text-slate-400 line-through">{fmtMoney(item.price)}</span>
              </>
            ) : (
              <span className="text-base font-bold text-brand-700">{fmtMoney(item.price)}</span>
            )}
          </div>
          {inCart ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <Plus size={12} /> {inCart.qty}
            </span>
          ) : (
            <span className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <Plus size={16} />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 flex-wrap">
          <span>🔥 {item.calories} kcal</span>
          {item.calories && <span>·</span>}
          <span>⏱ {item.prepTimeMinutes} min</span>
          {item.calories && item.calories < 300 && <><span>·</span><span className="text-emerald-500 font-semibold">Light</span></>}
          {item.calories && item.calories > 600 && <><span>·</span><span className="text-amber-500 font-semibold">Hearty</span></>}
        </div>
        {(item.allergens || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(item.allergens || []).slice(0, 3).map((a) => (
              <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{a}</span>
            ))}
            {(item.allergens || []).length > 3 && <span className="text-[10px] text-slate-400">+{(item.allergens || []).length - 3}</span>}
          </div>
        )}
        {dietary?.allergens?.length > 0 && (item.allergens || []).some((a) => dietary.allergens.includes(a)) && (
          <div className="mt-1 text-[10px] text-rose-500 font-semibold flex items-center gap-1">
            ⚠️ Contains: {(item.allergens || []).filter((a) => dietary.allergens.includes(a)).join(', ')}
          </div>
        )}
      </div>
    </button>
  );
}

export default function GuestMenuPage() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const { items, addItem, updateQty, removeItem, subtotal, count, setBranch } = useCart();
  const socket = useSocket();
  const themeCtx = useTheme();
  const langCtx = useLanguage();
  const { t } = langCtx;
  const toast = useToast();

  const [ctx, setCtx] = useState(null);
  const [menu, setMenu] = useState(null);
  const [activeCat, setActiveCat] = useState('all');
  const { query: search, setQuery: setSearch, results: matched, suggestions: searchSuggestions, intentLabel } = useSmartSearch(menu?.items || []);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartUpsell, setCartUpsell] = useState([]);
  const cartUpsellTopRef = useRef(null);
  const [tab, setTab] = useState('order');
  const [reco, setReco] = useState([]);
  const [chefPickLevels, setChefPickLevels] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dietary, setDietary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_dietary') || '{"allergens":[],"preferences":[]}'); } catch { return { allergens: [], preferences: [] }; }
  });
  const [showDietary, setShowDietary] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [tables, setTables] = useState([]);
  const [showTables, setShowTables] = useState(false);
  const [listening, setListening] = useState(false);

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast?.error?.('Voice search not supported in this browser');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = langCtx.lang === 'am' ? 'am-ET' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: ctxData } = await catalogApi.resolveQr(qrToken);
        setCtx(ctxData);
        setBranch(ctxData.branch._id);
        const menuRes = await catalogApi.menu(ctxData.branch._id);
        setMenu(menuRes.data);
        analyticsApi
          .demandToday(ctxData.branch._id)
          .then((res) => {
            const map = new Map();
            (res?.data?.items || []).forEach((it) => map.set(String(it.itemId), it.level));
            setChefPickLevels(map);
          })
          .catch(() => {});
      } catch (err) {
        setError(err.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    })();
  }, [qrToken, navigate, setBranch]);

  useEffect(() => {
    if (!ctx) return;
    catalogApi.tables(ctx.branch._id).then((res) => setTables(res.data || [])).catch(() => {});
  }, [ctx]);

  useEffect(() => {
    if (!ctx) return;
    const s = socket?.socket;
    if (s) {
      s.emit('join-guest', guestId());
    }
  }, [ctx, socket]);

  useEffect(() => {
    if (!ctx) return;
    const ids = items.map((i) => i.menuItem._id);
    analyticsApi
      .recommendations(ctx.branch._id, guestId(), ids.length > 0 ? ids : undefined)
      .then((res) => setReco(res.data))
      .catch(() => {});
  }, [ctx, items]);

  useEffect(() => {
    if (!cartOpen || !ctx || items.length === 0) {
      setCartUpsell([]);
      cartUpsellTopRef.current = null;
      return;
    }
    const topId = String(items[0].menuItem._id);
    if (cartUpsellTopRef.current === topId) return;
    cartUpsellTopRef.current = topId;
    catalogApi
      .coOrdered(ctx.branch._id, topId)
      .then((res) => setCartUpsell((res.data || []).filter((s) => !items.find((i) => String(i.menuItem._id) === String(s._id))).slice(0, 4)))
      .catch(() => setCartUpsell([]));
  }, [cartOpen, ctx, items]);

  const filtered = useMemo(() => {
    if (!menu) return [];
    let list = matched;
    if (activeCat !== 'all') list = list.filter((i) => String(i.category?._id) === String(activeCat));
    return list;
  }, [menu, activeCat, matched]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'price-low') list.sort((a, b) => (a.promotionPrice || a.price) - (b.promotionPrice || b.price));
    if (sortBy === 'price-high') list.sort((a, b) => (b.promotionPrice || b.price) - (a.promotionPrice || a.price));
    if (sortBy === 'calories') list.sort((a, b) => a.calories - b.calories);
    if (sortBy === 'prep-time') list.sort((a, b) => a.prepTimeMinutes - b.prepTimeMinutes);
    if (sortBy === 'popular') list.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
    return list;
  }, [filtered, sortBy]);

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
            <p>1. The API server is running</p>
            <p>2. The database is seeded</p>
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
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50 dark:from-slate-950 dark:to-slate-900 pb-32">
      <header className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white sticky top-0 z-30 shadow-xl shadow-brand-900/20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-1">
            <button onClick={langCtx.toggle} className="p-2 rounded-full hover:bg-brand-800 transition-colors" title={langCtx.lang === 'en' ? 'Switch to Amharic' : 'Switch to English'}>
              <Globe size={18} />
              <span className="text-[10px] font-bold ml-0.5">{langCtx.lang === 'en' ? 'አማ' : 'EN'}</span>
            </button>
            <button onClick={themeCtx.toggle} className="p-2 rounded-full hover:bg-brand-800 transition-colors" title={themeCtx.dark ? 'Light mode' : 'Dark mode'}>
              {themeCtx.dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setShowDietary(true)} className="p-2 rounded-full hover:bg-brand-800 transition-colors relative" title="Dietary preferences">
              <UserRound size={20} />
              {dietary.allergens.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-brand-900" />}
            </button>
            <button onClick={() => setCartOpen(true)} className="relative p-2 rounded-full hover:bg-brand-800 transition-colors">              <ShoppingCart size={22} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-4 flex gap-2">
        <button
          onClick={() => setTab('order')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === 'order' ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-600 border dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
        >
          🍽️ {t('order')} {t('food')}
        </button>
        {ctx.kind === 'room' && (
          <button
            onClick={() => setTab('service')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === 'service' ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-600 border dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
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
          <div className="relative mt-4">
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input
               className="input pl-10 pr-20 rounded-full"
               placeholder={t('search')}
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
             {search && (
               <button
                 onClick={() => setSearch('')}
                 className="absolute right-14 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                 title="Clear search"
               >
                 <X size={14} />
               </button>
             )}
             <button onClick={startVoiceSearch} disabled={listening}
               className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
               title="Voice search">
               {listening ? <MicOff size={16} /> : <Mic size={16} />}
             </button>

             {searchSuggestions.length > 0 && (
               <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                 {searchSuggestions.map((s) => (
                   <button
                     key={s._id}
                     onClick={() => { const full = menu?.items.find((i) => String(i._id) === String(s._id)); setSearch(''); if (full) addToCart(full); }}
                     className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                   >
                     <DishImage src={s.image} alt={s.name} size="w-8 h-8" textSize="text-sm" rounded="rounded-lg" />
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium truncate">{s.name}</p>
                       <p className="text-[10px] text-slate-400 truncate">{s.category || '—'}</p>
                     </div>
                   </button>
                 ))}
               </div>
             )}
           </div>

           {intentLabel && (
             <div className="mt-2 flex items-center gap-2 text-xs">
               <span className="badge bg-brand-100 text-brand-700">🧠 {intentLabel}</span>
               <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
             </div>
           )}

           {tables.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setShowTables(!showTables)} className="w-full card p-3 flex items-center justify-between hover:shadow-md transition-all">
                <span className="text-sm font-semibold">🪑 Table Availability</span>
                <span className="text-xs text-slate-400">{tables.filter((t) => t.status === 'available').length} available of {tables.length}</span>
              </button>
              {showTables && (
                <div className="card p-4 mt-2">
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {tables.map((t) => (
                      <div key={t._id} className={`flex flex-col items-center p-2 rounded-xl text-xs transition-all ${
                        t.status === 'available' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                        t.status === 'occupied' ? 'bg-rose-50 border border-rose-200 text-rose-500' :
                        'bg-slate-50 border border-slate-200 text-slate-400'
                      }`}>
                        <span className="font-bold">{t.number}</span>
                        <span className="text-[10px]">{t.seats}p</span>
                        <span className="w-2 h-2 rounded-full mt-1 bg-current" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Available</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Occupied</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Reserved</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: 'default', label: t('recommended') },
              { key: 'price-low', label: t('priceLow') },
              { key: 'price-high', label: t('priceHigh') },
              { key: 'calories', label: t('lowCal') },
              { key: 'prep-time', label: t('fastest') },
              { key: 'popular', label: t('popular') },
            ].map((s) => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sortBy === s.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto py-4 -mx-4 px-4 scrollbar-none">
            <button
              onClick={() => setActiveCat('all')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCat === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border text-slate-600'}`}
            >
              All
            </button>
            {menu.categories.map((c) => {
              const count = menu.items.filter((i) => String(i.category?._id) === String(c._id)).length;
              return (
                <button
                  key={c._id}
                  onClick={() => setActiveCat(c._id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCat === c._id ? 'bg-slate-900 text-white shadow-md' : 'bg-white border text-slate-600'}`}
                >
                  {c.icon} {c.name}
                  <span className="ml-1 text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {activeCat === 'all' && !search && menu?.items && (() => {
            const topItems = [...menu.items].sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0)).filter((i) => (i.orderCount || 0) > 0).slice(0, 4);
            if (topItems.length === 0) return null;
            return (
              <div className="card p-4 mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-white">
                <p className="font-bold text-amber-800 flex items-center gap-2 mb-3">{t('mostLoved')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {topItems.map((item) => (
                    <button key={item._id} onClick={() => addToCart(item)} className="flex flex-col items-center text-center p-2 rounded-xl border border-amber-100 bg-white hover:border-amber-300 transition-all active:scale-95">
                      <DishImage src={item.image} alt={item.name} size="w-12 h-12" textSize="text-xl" rounded="rounded-xl" />
                      <p className="font-semibold text-xs mt-1.5 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-amber-600">{item.orderCount} orders</p>
                    </button>
                  ))}
                </div>
              </div>
            );
           })()}

           {activeCat === 'all' && !search && menu?.items && (() => {
             const picks = menu.items.filter((i) => chefPickLevels.get(String(i._id)) === 'HIGH');
             if (picks.length === 0) return null;
             return (
               <div className="card p-4 mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-white">
                 <p className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                   <Sparkles size={14} /> Chef's Smart Picks for today
                 </p>
                 <p className="text-xs text-amber-700 mb-3">AI-forecasted high-demand dishes for today — don't miss out.</p>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                   {picks.slice(0, 4).map((item) => (
                     <button key={item._id} onClick={() => addToCart(item)} className="flex flex-col items-center text-center p-2 rounded-xl border border-amber-100 bg-white hover:border-amber-300 transition-all active:scale-95">
                       <DishImage src={item.image} alt={item.name} size="w-12 h-12" textSize="text-xl" rounded="rounded-xl" />
                       <p className="font-semibold text-xs mt-1.5 line-clamp-1">{item.name}</p>
                       <p className="text-[10px] text-amber-600 font-semibold">HIGH demand</p>
                     </button>
                   ))}
                 </div>
               </div>
             );
           })()}

           {reco.length > 0 && activeCat === 'all' && !search && (
            <div className="card p-4 mb-6 border-brand-200 bg-gradient-to-r from-brand-50 to-white">
              <p className="font-bold text-brand-800 flex items-center gap-2 mb-3">
                <Sparkles size={16} /> {t('aiPicks')}
              </p>
              <div className="space-y-2">
                {reco.slice(0, 3).map((r) => (
                  <button
                    key={r.menuItem._id}
                    onClick={() => addToCart(r.menuItem)}
                    className="w-full flex items-center gap-3 text-left rounded-xl border border-brand-100 bg-white p-2.5 hover:border-brand-300 transition-colors active:scale-[0.99]"
                  >
                    <DishImage src={r.menuItem.image} alt={r.menuItem.name} size="w-14 h-14" textSize="text-2xl" />
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

          {sorted.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-slate-400 font-medium">{t('noItems')}</p>
              <button onClick={() => { setSearch(''); setActiveCat('all'); }} className="text-brand-600 text-sm font-semibold mt-2">
                {t('clearFilters')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sorted.map((item) => (
                <MenuCard key={item._id} item={item} inCart={inCart(item._id)} onClick={() => addToCart(item)} dietary={dietary} popularity={item.orderCount || 0} chefPick={chefPickLevels.get(String(item._id)) === 'HIGH'} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={handleAdd} chefPick={chefPickLevels.get(String(selectedItem._id)) === 'HIGH'} />
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title={`Your Order (${count} items)`}>
        {items.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">🛒</div>
            <p className="text-slate-400">Your cart is empty.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.key} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                <DishImage src={i.menuItem.image} alt={i.menuItem.name} size="w-14 h-14" textSize="text-2xl" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{i.menuItem.name}</p>
                  {i.optionsLabel?.length > 0 && (
                    <p className="text-xs text-slate-400 truncate">{i.optionsLabel.join(' · ')}</p>
                  )}
                  <p className="text-xs text-brand-700 font-semibold">{fmtMoney(i.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(i.key, i.qty - 1)} className="w-7 h-7 rounded-lg border flex items-center justify-center active:scale-95">
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                  <button onClick={() => updateQty(i.key, i.qty + 1)} className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center active:scale-95">
                    <Plus size={13} />
                  </button>
                </div>
                <button onClick={() => removeItem(i.key)} className="text-rose-400 text-xs font-semibold ml-1">✕</button>
              </div>
            ))}
            {cartUpsell.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="font-semibold text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Sparkles size={12} /> Pairs well with
                </p>
                <div className="space-y-2">
                  {cartUpsell.map((s) => (
                    <div key={s._id} className="flex items-center gap-2.5">
                      <DishImage src={s.image} alt={s.name} size="w-9 h-9" textSize="text-sm" rounded="rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs line-clamp-1">{s.name}</p>
                        {s.category && <p className="text-[9px] text-slate-400">{s.category}</p>}
                      </div>
                      <p className="text-xs font-bold text-brand-700 shrink-0">{fmtMoney(s.price)}</p>
                      <button onClick={() => addItem(s, 1, [], '')} className="p-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 active:scale-90 transition">
                        <Plus size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
