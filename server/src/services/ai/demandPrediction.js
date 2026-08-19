/**
 * AI Demand Prediction.
 *
 * Uses historical orders grouped by day-of-week to forecast expected demand for
 * each menu item. A recency-weighted average produces the expected quantity and
 * a percentile threshold buckets results into HIGH / MEDIUM / LOW so the manager
 * can plan ingredients and staff.
 */
import Order from '../../models/Order.js';
import MenuItem from '../../models/MenuItem.js';
import DemandForecast from '../../models/DemandForecast.js';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatForecastFor(d) {
  return d.toISOString().slice(0, 10);
}

export async function predictDemand({ branch, date = new Date(), save = true }) {
  const forecastFor = formatForecastFor(date);
  const targetDow = new Date(date).getDay();

  const since = new Date(date.getTime() - 28 * 24 * 3600 * 1000);

  const orders = await Order.find({
    branch,
    status: { $nin: ['CANCELLED'] },
    createdAt: { $gte: since, $lte: new Date(date.getTime() + 24 * 3600 * 1000) },
  }).select('items createdAt');

  const perItem = new Map();

  for (const o of orders) {
    if (new Date(o.createdAt).getDay() !== targetDow) continue;
    const ageWeeks = Math.max(1, (new Date(date).getTime() - new Date(o.createdAt).getTime()) / (7 * 24 * 3600 * 1000));
    const recencyWeight = 1 / Math.min(ageWeeks, 4);
    for (const it of o.items) {
      const key = String(it.menuItem || it.name || `unknown_${Math.random()}`);
      const entry = perItem.get(key) || { count: 0, weight: 0, name: it.name, itemId: it.menuItem };
      entry.count += it.quantity;
      entry.weight += recencyWeight;
      perItem.set(key, entry);
    }
  }

  const menuItems = await MenuItem.find({ branch, available: true }).select('name');
  for (const mi of menuItems) {
    if (!perItem.has(String(mi._id))) {
      perItem.set(String(mi._id), { count: 0, weight: 0, name: mi.name, itemId: mi._id });
    }
  }

  const entries = [...perItem.values()].map((e) => ({
    itemId: e.itemId,
    name: e.name,
    expected: e.weight > 0 ? Math.round((e.count / e.weight) * 10) / 10 : 0,
  }));

  const values = entries.map((e) => e.expected).filter((v) => v > 0).sort((a, b) => a - b);
  const n = values.length;
  const highThreshold = n ? values[Math.floor(n * 0.66)] : 3;
  const lowThreshold = n ? values[Math.floor(n * 0.33)] : 0.5;

  const items = entries.map((e) => ({
    itemId: e.itemId,
    name: e.name,
    expected: e.expected,
    level: e.expected >= highThreshold ? 'HIGH' : e.expected <= lowThreshold ? 'LOW' : 'MEDIUM',
  }));

  items.sort((a, b) => b.expected - a.expected);

  const note = `Forecast for ${DOW[targetDow]} (${forecastFor}). Based on the last 28 days of order history for the same day of week.`;

  let forecast;
  if (save) {
    forecast = await DemandForecast.findOneAndUpdate(
      { branch, forecastFor },
      { items, note },
      { new: true, upsert: true }
    );
  }

  return { forecastFor, dow: DOW[targetDow], note, items, forecast: forecast || null };
}
