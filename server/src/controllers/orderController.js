import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Coupon from '../models/Coupon.js';
import Table from '../models/Table.js';
import Room from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { orderService } from '../services/orders/orderService.js';
import { paymentService } from '../services/payments/paymentService.js';
import { notificationService } from '../services/notifications/notificationService.js';
import { canTransition } from '../services/orders/orderStateMachine.js';
import { round2 } from '../utils/helpers.js';

const buildServerItems = (menuItems, lineItems) =>
  lineItems.map((line) => {
    const item = menuItems.find((m) => String(m._id) === String(line.menuItem));
    if (!item) throw new AppError(`Menu item not found: ${line.menuItem}`, 400);
    if (!item.available) throw new AppError(`${item.name} is currently unavailable`, 400);

    let unitPrice = (item.promotionPrice && item.promotionPrice < item.price) ? item.promotionPrice : item.price;
    const optionDetails = [];
    for (const sel of line.options || []) {
      const opt = item.options.find((o) => String(o.id) === String(sel.optionId));
      if (!opt) continue;
      const choices = (sel.choiceIds || [])
        .map((cid) => opt.choices.find((c) => String(c.id) === String(cid)))
        .filter(Boolean);
      const delta = choices.reduce((s, c) => s + (c.priceDelta || 0), 0);
      unitPrice += delta;
      if (choices.length) {
        optionDetails.push({
          name: opt.name,
          choices: choices.map((c) => ({ label: c.label, priceDelta: c.priceDelta })),
        });
      }
    }

    return {
      menuItem: item._id,
      name: item.name,
      image: item.image,
      quantity: line.quantity,
      unitPrice: round2(unitPrice),
      options: optionDetails,
      note: line.note || '',
      subtotal: round2(unitPrice * line.quantity),
      prepTimeMinutes: item.prepTimeMinutes || 0,
    };
  });

export const createOrder = asyncHandler(async (req, res) => {
  const { branch, table, room, customerId, customerName, items, couponCode, paymentMethod, source, note, tip, idempotencyKey } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  const ids = [...new Set(items.map((i) => i.menuItem))];
  const menuItems = await MenuItem.find({ _id: { $in: ids }, branch }).select('+ingredientLinks');

  const serverItems = buildServerItems(menuItems, items);
  let coupon = null;
  if (couponCode) {
    const upperCode = String(couponCode).toUpperCase();
    const updated = await Coupon.findOneAndUpdate(
      { code: upperCode, branch, active: true, $expr: { $lt: ['$usedCount', '$maxUses'] }, $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }] },
      { $inc: { usedCount: 1 } },
      { new: true }
    );
    if (!updated) {
      throw new AppError('Invalid or expired coupon', 400);
    }
    if (serverItems.reduce((s, i) => s + i.subtotal, 0) < updated.minOrder) {
      await Coupon.findOneAndUpdate({ code: upperCode, branch }, { $inc: { usedCount: -1 } });
      throw new AppError(`Coupon requires a minimum order of ${updated.minOrder}`, 400);
    }
    coupon = updated;
  }

  const totals = orderService.computeTotals(serverItems, coupon, tip);

  let order;
  try {
    order = await orderService.createOrder({
      branch,
      table,
      room,
      customerId,
      customerName,
      items: serverItems,
      source,
      note,
      idempotencyKey,
      totals,
      paymentMethod,
      couponCode: coupon?.code || '',
    });
  } catch (err) {
    if (coupon) {
      await Coupon.findOneAndUpdate({ code: coupon.code, branch }, { $inc: { usedCount: -1 } }).catch(() => {});
    }
    if (err.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) return res.status(200).json({ success: true, data: { order: existing, payment: null, duplicate: true } });
    }
    throw err;
  }

  if (paymentMethod === 'cash') {
    const { order: confirmed } = await orderService.confirmOrder(order, customerName || 'Guest');
    if (table) await Table.findByIdAndUpdate(table, { status: 'occupied' });
    if (room) await Room.findByIdAndUpdate(room, { status: 'occupied' });
    const emitted = await Order.findById(order._id)
      .populate('table', 'number label')
      .populate('room', 'number');
    notificationService.branch(branch, 'order:new', emitted);
    if (customerId) notificationService.guest(customerId, 'order:created', emitted);
    return res.status(201).json({ success: true, data: { order: confirmed, payment: null } });
  }

  // Online payment — amount is verified server-side against the DB.
  await orderService.transition(order, 'PAYMENT_PENDING', customerName || 'Guest');
  const result = await paymentService.processPayment(order, paymentMethod, order.total);
  if (!result.success) {
    await orderService.cancelOrder(order, 'system', `Payment failed: ${result.reason || 'Gateway declined'}`);
    throw new AppError(result.reason || 'Payment failed', 402);
  }

  const { order: confirmed } = await orderService.confirmOrder(order, 'payment');
  if (table) await Table.findByIdAndUpdate(table, { status: 'occupied' });
  if (room) await Room.findByIdAndUpdate(room, { status: 'occupied' });
  const emitted = await Order.findById(order._id)
    .populate('table', 'number label')
    .populate('room', 'number');
  notificationService.branch(branch, 'order:new', emitted);
  if (customerId) notificationService.guest(customerId, 'order:created', emitted);

  res.status(201).json({ success: true, data: { order: confirmed, payment: result.payment } });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('table', 'number label')
    .populate('room', 'number');
  if (!order) throw new AppError('Order not found', 404);
  res.json({ success: true, data: order });
});

export const listOrders = asyncHandler(async (req, res) => {
  const { branch, status, limit = 50 } = req.query;
  const filter = branch ? { branch } : {};
  if (status) filter.status = status;
  const orders = await Order.find(filter)
    .populate('table', 'number label')
    .populate('room', 'number')
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200));
  res.json({ success: true, data: orders });
});

export const guestHistory = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const orders = await Order.find({ customerId })
    .populate('table', 'number label')
    .populate('room', 'number')
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ success: true, data: orders });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { to, note } = req.body;
  const order = await Order.findById(id);
  if (!order) throw new AppError('Order not found', 404);
  if (!canTransition(order.status, to)) {
    throw new AppError(`Cannot move order from ${order.status} to ${to}`, 400);
  }
  await orderService.transition(order, to, req.user?.name || 'staff', note || '');
  if (to === 'COMPLETED' || to === 'CANCELLED') {
    if (order.table) {
      const otherActive = await Order.countDocuments({ table: order.table, status: { $in: ['CREATED', 'CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }, _id: { $ne: order._id } });
      if (otherActive === 0) await Table.findByIdAndUpdate(order.table, { status: 'available' });
    }
    if (order.room) {
      const otherActive = await Order.countDocuments({ room: order.room, status: { $in: ['CREATED', 'CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }, _id: { $ne: order._id } });
      if (otherActive === 0) await Room.findByIdAndUpdate(order.room, { status: 'vacant' });
    }
  }
  const populated = await Order.findById(order._id)
    .populate('table', 'number label')
    .populate('room', 'number');
  res.json({ success: true, data: populated });
});

export const kitchenAction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const result = await orderService.handleKitchenTicket(id, action, req.user);
  res.json({ success: true, data: result });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const order = await Order.findById(id);
  if (!order) throw new AppError('Order not found', 404);
  if (req.user?.role === 'guest') {
    const callerId = String(req.user._id);
    if (order.customerId && order.customerId !== callerId) {
      throw new AppError('You can only cancel your own orders', 403);
    }
  }
  const by = req.user?.name || order.customerName || 'Guest';
  const result = await orderService.cancelOrder(order, by, reason || 'Cancelled');
  res.json({ success: true, data: result });
});

export const waiterDeliver = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) throw new AppError('Order not found', 404);
  if (order.status !== 'READY') throw new AppError('Order is not ready for delivery', 400);
  await orderService.transition(order, 'OUT_FOR_DELIVERY', req.user?.name || 'waiter');
  const populated = await Order.findById(order._id)
    .populate('table', 'number label')
    .populate('room', 'number');
  res.json({ success: true, data: populated });
});

export const guestLoyalty = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const stats = await Order.aggregate([
    { $match: { customerId, status: { $ne: 'CANCELLED' } } },
    { $group: {
      _id: null,
      totalOrders: { $sum: 1 },
      totalSpent: { $sum: '$total' },
      totalItems: { $sum: { $size: '$items' } },
      avgOrderValue: { $avg: '$total' },
      firstOrder: { $min: '$createdAt' },
      lastOrder: { $max: '$createdAt' },
    }},
  ]);
  const s = stats[0] || { totalOrders: 0, totalSpent: 0, totalItems: 0, avgOrderValue: 0 };
  const points = Math.floor((s.totalSpent || 0) / 100);
  const tier = points >= 500 ? 'Platinum' : points >= 200 ? 'Gold' : points >= 50 ? 'Silver' : 'Bronze';
  res.json({ success: true, data: {
    totalOrders: s.totalOrders,
    totalSpent: s.totalSpent || 0,
    totalItems: s.totalItems || 0,
    avgOrderValue: Math.round(s.avgOrderValue || 0),
    points,
    tier,
    firstOrder: s.firstOrder,
    lastOrder: s.lastOrder,
  }});
});

export const smartEta = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) throw new AppError('Order not found', 404);

  const avgTimes = await Order.aggregate([
    { $match: { branch: order.branch, status: 'COMPLETED' } },
    { $project: {
      prepMs: { $subtract: ['$updatedAt', '$createdAt'] },
      itemCount: { $size: '$items' },
    }},
    { $group: {
      _id: null,
      avgPrepMs: { $avg: '$prepMs' },
      avgItemCount: { $avg: '$itemCount' },
      count: { $sum: 1 },
    }},
  ]);

  const avg = avgTimes[0] || { avgPrepMs: 15 * 60 * 1000, avgItemCount: 3 };
  const baseMinutes = Math.round((avg.avgPrepMs || 15 * 60 * 1000) / 60000);
  const itemCountFactor = (order.items.length / (avg.avgItemCount || 3));
  const estimatedMinutes = Math.max(5, Math.round(baseMinutes * Math.max(0.6, itemCountFactor)));

  const pendingCount = await Order.countDocuments({
    branch: order.branch,
    status: { $in: ['CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING'] },
    createdAt: { $lt: order.createdAt },
  });

  const queueWait = pendingCount * 3;
  const totalEta = estimatedMinutes + queueWait;

  res.json({ success: true, data: {
    estimatedMinutes: totalEta,
    basePrepMinutes: estimatedMinutes,
    queuePosition: pendingCount,
    queueWaitMinutes: queueWait,
    historicalOrders: avg.count || 0,
  }});
});
