import { useState, useMemo } from 'react';

const MEAT = ['chicken', 'beef', 'pepperoni', 'steak', 'bacon'];
const DAIRY_EGGS = ['cheese', 'milk', 'egg', 'cocoa', 'butter', 'cream'];

function parseIntent(raw) {
  const q = (raw || '').toLowerCase().trim();
  const intent = {};
  if (!q) return intent;

  let m = q.match(/(?:under|under|below|less than|less than)\s*(\d+)\s*(?:etb|eth|birr|£|\$)?/i);
  m = m || q.match(/(?:under|below|less than)\s*(\d+)\b/i);
  if (m) intent.maxPrice = Number(m[1]);
  if (/\bcheap\b/i.test(q)) intent.maxPrice = 80;
  if (/affordable|good value|reasonable/i.test(q)) intent.maxPrice = 150;

  m = q.match(/(?:under|below|less than|in)\s*(\d+)\s*(?:cal|calories|kcal)?\b/i);
  if (m) intent.maxCalories = Number(m[1]);
  if (/low calorie|light|healthy/i.test(q)) intent.maxCalories = 400;
  if (/hearty|heavy|rich/i.test(q)) intent.minCalories = 500;

  m = q.match(/(?:under|below|less than|in)\s*(\d+)\s*(?:min|minutes?|mins)\b/i);
  if (m) intent.maxPrep = Number(m[1]);
  if (/quick|fast|express/i.test(q)) intent.maxPrep = 15;
  if (/ready now|immediate|now/i.test(q)) intent.maxPrep = 8;

  if (/vegan/i.test(q)) intent.vegan = true;
  if (/vegetarian|veggie/i.test(q)) intent.vegetarian = true;
  if (/gluten[-]?(?:free)?|no gluten/i.test(q)) intent.noGluten = true;
  if (/dairy[-]?(?:free)?|no dairy/i.test(q)) intent.noDairy = true;

  if (/spicy|hot|fiery/i.test(q)) intent.spicy = true;
  if (/special|chef/i.test(q)) intent.special = true;
  if (/promo|discount|on sale|discounted/i.test(q)) intent.onSale = true;

  if (/burger/i.test(q)) intent.category = 'burger';
  if (/pizza/i.test(q)) intent.category = 'pizza';
  if (/drink|beverage|juice|coffee|water/i.test(q)) intent.category = 'drinks';
  if (/dessert|desserts/i.test(q)) intent.category = 'dessert';
  if (/starter|appetizer/i.test(q)) intent.category = 'starter';
  if (/main|entree/i.test(q)) intent.category = 'main';

  return intent;
}

function matchesFuzzy(item, q) {
  if (!q.trim()) return true;
  const hay = `${item.name || ''} ${item.description || ''} ${item.category?.name || ''} ${(item.allergens || []).join(' ')} ${(item.ingredients || []).join(' ')}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function ingredientIncludes(item, term) {
  return (item.ingredients || []).some((ing) => String(ing).toLowerCase().includes(term));
}

function hasMeat(item) {
  return MEAT.some((w) => ingredientIncludes(item, w));
}

function hasDairyOrEggs(item) {
  const allergens = (item.allergens || []).map((a) => a.toLowerCase());
  if (DAIRY_EGGS.some((w) => allergens.includes(w))) return true;
  return DAIRY_EGGS.some((w) => ingredientIncludes(item, w));
}

function applyIntent(item, intent) {
  if (intent.maxPrice != null && Number(item.price || 0) > intent.maxPrice) return false;
  if (intent.maxCalories != null && Number(item.calories || 0) > intent.maxCalories) return false;
  if (intent.minCalories != null && Number(item.calories || 0) < intent.minCalories) return false;
  if (intent.maxPrep != null && Number(item.prepTimeMinutes || 0) > intent.maxPrep) return false;
  if (intent.special && !item.special) return false;
  if (intent.onSale && !(item.promotionPrice && item.promotionPrice < item.price)) return false;
  if (intent.spicy && !`${item.name || ''} ${item.description || ''}`.toLowerCase().includes('spicy')) return false;
  if (intent.noGluten && (item.allergens || []).includes('Gluten')) return false;
  if (intent.noDairy && (item.allergens || []).includes('Dairy')) return false;
  if (intent.vegan && (hasMeat(item) || hasDairyOrEggs(item))) return false;
  if (intent.vegetarian && hasMeat(item)) return false;
  if (intent.category) {
    const cat = `${item.category?.name || ''}`.toLowerCase();
    const catMap = {
      burger: /burger/,
      pizza: /pizza/,
      drinks: /drink|beverage/,
      dessert: /dessert/,
      starter: /starter|appetizer/,
      main: /main|entree/,
    };
    if (!catMap[intent.category].test(cat)) return false;
  }
  return true;
}

const LABELS = {
  maxPrice: (v) => `under ${v} ETB`,
  maxCalories: (v) => `≤${v} cal`,
  minCalories: (v) => `≥${v} cal`,
  maxPrep: (v) => `≤${v} min`,
  vegan: 'vegan',
  vegetarian: 'vegetarian',
  noGluten: 'gluten-free',
  noDairy: 'dairy-free',
  spicy: 'spicy',
  special: "chef's special",
  onSale: 'on sale',
  category: (v) => `${v}`,
};

export function intentSummary(intent) {
  const keys = Object.keys(intent);
  if (!keys.length) return '';
  return keys
    .map((k) => {
      const v = intent[k];
      const label = LABELS[k];
      return typeof label === 'function' ? label(v) : label;
    })
    .join(', ');
}

export default function useSmartSearch(items) {
  const [query, setQuery] = useState('');

  const intent = useMemo(() => parseIntent(query), [query]);
  const hasIntent = Object.keys(intent).length > 0;

  const matching = useMemo(() => {
    if (!items || !items.length) return [];
    const base = hasIntent ? items.filter((it) => applyIntent(it, intent)) : items.filter((it) => matchesFuzzy(it, query));
    return base;
  }, [items, query, intent, hasIntent]);

  const suggestions = useMemo(() => {
    if (!items || !items.length || !query.trim()) return [];
    return items
      .filter((it) => matchesFuzzy(it, query))
      .slice(0, 6)
      .map((it) => ({ _id: it._id, name: it.name, image: it.image, category: it.category?.name, price: it.price }));
  }, [items, query]);

  const summary = hasIntent ? intentSummary(intent) : '';

  return { query, setQuery, results: matching, suggestions, intentLabel: summary, hasIntent };
}
