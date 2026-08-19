import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const CartContext = createContext(null);

const loadCart = (branch) => {
  try {
    return JSON.parse(localStorage.getItem(`sh_cart_${branch}`) || '[]');
  } catch {
    return [];
  }
};

function formatOptions(menuItem, selected) {
  if (!selected || selected.length === 0) return [];
  return selected
    .map((sel) => {
      const opt = (menuItem.options || []).find((o) => String(o.id) === String(sel.optionId));
      if (!opt) return null;
      const labels = (sel.choiceIds || [])
        .map((cid) => opt.choices.find((c) => String(c.id) === String(cid))?.label)
        .filter(Boolean);
      return labels.length ? `${opt.name}: ${labels.join(', ')}` : null;
    })
    .filter(Boolean);
}

function calcOptionsDelta(menuItem, options) {
  return (options || []).reduce((sum, sel) => {
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
}

export function CartProvider({ children }) {
  const [branch, setBranchState] = useState(() => {
    try { return localStorage.getItem('sh_cart_branch') || null; } catch { return null; }
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (branch) {
      setItems(loadCart(branch));
      try { localStorage.setItem('sh_cart_branch', branch); } catch {}
    }
  }, [branch]);

  const setBranch = useCallback((val) => {
    setBranchState(val);
  }, []);

  const addItem = useCallback(
    (menuItem, qty, options, note) => {
      const key = `${menuItem._id}:${JSON.stringify(options)}`;
      const optionsDelta = calcOptionsDelta(menuItem, options);
      const basePrice = (menuItem.promotionPrice && menuItem.promotionPrice < menuItem.price)
        ? menuItem.promotionPrice
        : Number(menuItem.price || 0);
      const unitPrice = basePrice + optionsDelta;

      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        let next;
        if (existing) {
          next = prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
        } else {
          next = [
            ...prev,
            {
              key,
              menuItem,
              qty,
              options: options || [],
              optionsLabel: formatOptions(menuItem, options),
              unitPrice,
              note: note || '',
            },
          ];
        }
        if (branch) localStorage.setItem(`sh_cart_${branch}`, JSON.stringify(next));
        return next;
      });
    },
    [branch]
  );

  const updateQty = useCallback(
    (key, qty) => {
      setItems((prev) => {
        const next = qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i));
        if (branch) localStorage.setItem(`sh_cart_${branch}`, JSON.stringify(next));
        return next;
      });
    },
    [branch]
  );

  const removeItem = useCallback(
    (key) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.key !== key);
        if (branch) localStorage.setItem(`sh_cart_${branch}`, JSON.stringify(next));
        return next;
      });
    },
    [branch]
  );

  const clear = useCallback(() => {
    setItems((prev) => {
      if (branch) localStorage.setItem(`sh_cart_${branch}`, JSON.stringify([]));
      return [];
    });
  }, [branch]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.unitPrice || 0) * i.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  return (
    <CartContext.Provider
      value={{ branch, setBranch, items, addItem, updateQty, removeItem, clear, subtotal, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
