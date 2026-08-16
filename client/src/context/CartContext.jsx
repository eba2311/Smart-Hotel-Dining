import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const CartContext = createContext(null);

const load = (branch) => {
  try {
    return JSON.parse(localStorage.getItem(`sh_cart_${branch}`) || '[]');
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [branch, setBranch] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (branch) setItems(load(branch));
  }, [branch]);

  const persist = useCallback(
    (next) => {
      setItems(next);
      if (branch) localStorage.setItem(`sh_cart_${branch}`, JSON.stringify(next));
    },
    [branch]
  );

  const addItem = useCallback(
    (menuItem, qty, options, note) => {
      const key = `${menuItem._id}:${JSON.stringify(options)}`;
      const existing = items.find((i) => i.key === key);
      if (existing) {
        persist(
          items.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
        );
      } else {
        const optionsDelta = (options || []).reduce((sum, sel) => {
          const opt = (menuItem.options || []).find((o) => String(o.id) === String(sel.optionId));
          if (!opt) return sum;
          return (
            sum +
            (sel.choiceIds || []).reduce((s, cid) => {
              const c = opt.choices.find((c2) => String(c2.id) === String(cid));
              return s + (c?.priceDelta || 0);
            }, 0)
          );
        }, 0);
        persist([
          ...items,
          {
            key,
            menuItem,
            qty,
            options: options || [],
            optionsLabel: formatOptions(menuItem, options),
            unitPrice: menuItem.price + optionsDelta,
            note: note || '',
          },
        ]);
      }
    },
    [items, persist]
  );

  const updateQty = useCallback(
    (key, qty) => {
      if (qty <= 0) persist(items.filter((i) => i.key !== key));
      else persist(items.map((i) => (i.key === key ? { ...i, qty } : i)));
    },
    [items, persist]
  );

  const removeItem = useCallback(
    (key) => persist(items.filter((i) => i.key !== key)),
    [items, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.unitPrice * i.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  return (
    <CartContext.Provider
      value={{ branch, setBranch, items, addItem, updateQty, removeItem, clear, subtotal, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

function formatOptions(menuItem, selected) {
  if (!selected || selected.length === 0) return [];
  return selected.map((sel) => {
    const opt = (menuItem.options || []).find((o) => String(o.id) === String(sel.optionId));
    if (!opt) return null;
    const labels = (sel.choiceIds || [])
      .map((cid) => opt.choices.find((c) => String(c.id) === String(cid))?.label)
      .filter(Boolean);
    return labels.length ? `${opt.name}: ${labels.join(', ')}` : null;
  }).filter(Boolean);
}

export const useCart = () => useContext(CartContext);
