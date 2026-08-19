import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Ingredient from '../models/Ingredient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { predictDemand } from '../services/ai/demandPrediction.js';
import { getRecommendations } from '../services/ai/recommendation.js';
import { analyzeFeedback } from '../services/ai/feedbackAnalysis.js';
import { config } from '../config/env.js';

const branchFilter = (branch) => (branch ? { branch } : {});

export const summary = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const base = branchFilter(branch);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
  const last7 = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const last30 = new Date(today.getTime() - 30 * 24 * 3600 * 1000);

  const [
    todayOrders,
    todaySalesAgg,
    ordersByStatus,
    activeOrders,
    last7SalesAgg,
    last30Orders,
    popular,
    avgRatingAgg,
    lowStock,
    revenueByDay,
  ] = await Promise.all([
    Order.countDocuments({ ...base, createdAt: { $gte: today, $lt: tomorrow } }),
    Order.aggregate([
      { $match: { ...base, createdAt: { $gte: today, $lt: tomorrow }, status: { $nin: ['CANCELLED'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: base },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ ...base, status: { $in: ['CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'PAYMENT_PENDING'] } }),
    Order.aggregate([
      { $match: { ...base, createdAt: { $gte: last7 }, status: { $nin: ['CANCELLED'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments({ ...base, createdAt: { $gte: last30 }, status: { $nin: ['CANCELLED'] } }),
    Order.aggregate([
      { $match: { ...base, createdAt: { $gte: last7 }, status: { $nin: ['CANCELLED'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, image: { $first: '$items.image' } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Review.aggregate([
      { $match: branch ? { branch } : {} },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Ingredient.find(branch ? { branch } : {}).then((ings) => ings.filter((i) => i.stock <= i.lowStockThreshold)).then((low) => low.map((i) => ({ _id: i._id, name: i.name, stock: i.stock, lowStockThreshold: i.lowStockThreshold }))),
    Order.aggregate([
      { $match: { ...base, createdAt: { $gte: last7 }, status: { $nin: ['CANCELLED'] } } },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: 1 } },
      { $group: { _id: '$day', total: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const peakHours = await Order.aggregate([
    { $match: { ...base, createdAt: { $gte: last30 }, status: { $nin: ['CANCELLED'] } } },
    { $project: { hour: { $hour: '$createdAt' } } },
    { $group: { _id: '$hour', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const statusMap = Object.fromEntries(ordersByStatus.map((s) => [s._id, s.count]));

  res.json({
    success: true,
    data: {
      currency: config.currency,
      todayOrders,
      todaySales: todaySalesAgg[0]?.total || 0,
      last7Sales: last7SalesAgg[0]?.total || 0,
      last30Orders,
      activeOrders,
      ordersByStatus: statusMap,
      popularItems: popular,
      satisfaction: avgRatingAgg[0] ? { avg: avgRatingAgg[0].avg, count: avgRatingAgg[0].count } : { avg: 0, count: 0 },
      lowStock,
      peakHours,
      revenueByDay,
    },
  });
});

export const revenueByPeriod = asyncHandler(async (req, res) => {
  const { branch, days = 30 } = req.query;
  const since = new Date(Date.now() - Math.max(1, parseInt(days, 10) || 30) * 24 * 3600 * 1000);
  const rows = await Order.aggregate([
    { $match: { ...branchFilter(branch), createdAt: { $gte: since }, status: { $nin: ['CANCELLED'] } } },
    { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: 1 } },
    { $group: { _id: '$day', total: { $sum: '$total' } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: rows });
});

export const satisfaction = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const reviews = await Review.find(branch ? { branch } : {}).select('sentiment rating');
  const aspects = { foodQuality: [], service: [], speed: [], price: [], menu: [] };
  let positive = 0;
  let negative = 0;
  let mixed = 0;

  for (const r of reviews) {
    if (r.sentiment?.overall === 'positive') positive += 1;
    else if (r.sentiment?.overall === 'negative') negative += 1;
    else if (r.sentiment?.overall === 'mixed') mixed += 1;
    for (const a of r.sentiment?.aspects || []) {
      if (aspects[a.aspect]) aspects[a.aspect].push(a.score || 0);
    }
  }

  const aspectScores = {};
  for (const [k, v] of Object.entries(aspects)) {
    if (v.length === 0) {
      aspectScores[k] = null;
      continue;
    }
    const avg = v.reduce((s, x) => s + x, 0) / v.length;
    aspectScores[k] = Math.round(Math.max(0, Math.min(100, 50 + avg)));
  }

  res.json({
    success: true,
    data: {
      count: reviews.length,
      distribution: { positive, negative, mixed, neutral: Math.max(0, reviews.length - positive - negative - mixed) },
      aspectScores,
    },
  });
});

export const demandForecast = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  if (!branch) throw new AppError('branch is required', 400);
  const date = req.query.date ? new Date(req.query.date) : new Date(Date.now() + 24 * 3600 * 1000);
  if (isNaN(date.getTime())) throw new AppError('Invalid date parameter', 400);
  const data = await predictDemand({ branch, date, save: true });
  res.json({ success: true, data });
});

export const todayDemand = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  if (!branch) throw new AppError('branch is required', 400);
  const data = await predictDemand({ branch, date: new Date(), save: false });
  res.json({ success: true, data });
});

export const recommendations = asyncHandler(async (req, res) => {
  const { branch, customerId } = req.query;
  const cartItemIds = (req.query.cart || '').split(',').filter(Boolean);
  const data = await getRecommendations({ branch, customerId, cartItemIds });
  res.json({ success: true, data });
});

export const feedbackAnalysis = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  res.json({ success: true, data: analyzeFeedback(comment) });
});
