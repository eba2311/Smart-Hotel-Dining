/**
 * AI Food Recommendation Engine.
 *
 * Hybrid approach combining:
 *   - content-based filtering (category affinity + ingredient overlap)
 *   - collaborative popularity signals (what others order)
 *   - personal order history
 *
 * Produces a scored list with human-readable reasons, e.g.
 *   "You may also like Chicken Alfredo because you previously ordered creamy pasta dishes."
 */
import Order from '../../models/Order.js';
import MenuItem from '../../models/MenuItem.js';

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

export async function getRecommendations({ branch, customerId, cartItemIds = [], limit = 6 }) {
  const history = await Order.find({
    branch,
    ...(customerId ? { customerId } : {}),
    status: { $nin: ['CANCELLED'] },
    createdAt: { $gte: new Date(Date.now() - 60 * 24 * 3600 * 1000) },
  }).select('items');

  const recentAll = await Order.find({
    branch,
    status: { $nin: ['CANCELLED'] },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
  }).select('items');

  const myCategories = new Map();
  const myItems = new Map();
  const myIngredientSet = new Set();

  for (const o of history) {
    for (const it of o.items) {
      if (!it.menuItem) continue;
      myItems.set(String(it.menuItem), (myItems.get(String(it.menuItem)) || 0) + it.quantity);
      for (const ing of it.ingredients || []) myIngredientSet.add(ing.toLowerCase());
    }
  }

  const categoryCount = new Map();
  const menuItems = await MenuItem.find({ branch, available: true }).populate('category');
  for (const item of menuItems) {
    const cid = String(item.category?._id || item.category);
    if (myItems.has(String(item._id))) {
      categoryCount.set(cid, (categoryCount.get(cid) || 0) + 1);
    }
  }
  const totalMyCat = [...categoryCount.values()].reduce((a, b) => a + b, 0) || 1;

  const popularity = new Map();
  for (const o of recentAll) {
    for (const it of o.items) {
      if (!it.menuItem) continue;
      popularity.set(String(it.menuItem), (popularity.get(String(it.menuItem)) || 0) + it.quantity);
    }
  }
  const maxPop = Math.max(1, ...popularity.values());

  const scored = [];

  for (const item of menuItems) {
    const id = String(item._id);
    if (cartItemIds.includes(id)) continue;

    let score = 0;
    const reasons = [];

    const cid = String(item.category?._id || item.category);
    const affinity = (categoryCount.get(cid) || 0) / totalMyCat;
    if (affinity > 0) {
      score += 2.0 * affinity;
      if (affinity > 0.15) reasons.push(`you enjoy ${item.category?.name || 'this type'} of dishes`);
    }

    if (myItems.has(id)) {
      score += 1.5;
      reasons.push('you ordered it before');
    }

    const overlap = item.ingredients.filter((ing) => myIngredientSet.has(String(ing).toLowerCase())).length;
    if (overlap > 0) {
      score += 0.5 * overlap;
      if (overlap >= 2) reasons.push('it shares ingredients with your past favourites');
    }

    const pop = popularity.get(id) || 0;
    if (pop > 0) {
      score += 0.5 * (pop / maxPop);
      if (pop / maxPop > 0.6) reasons.push('it is very popular right now');
    }

    scored.push({ item, score, reasons: [...new Set(reasons)].slice(0, 2) });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map(({ item, score, reasons }) => ({
      menuItem: item,
      score: Math.round(score * 100) / 100,
      reason: reasons.length
        ? `You may also like ${item.name} because ${reasons.join(' and ')}.`
        : `${item.name} is a great choice for you.`,
    }));
}
