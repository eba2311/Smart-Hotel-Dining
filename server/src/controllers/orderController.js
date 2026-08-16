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

    let unitPrice = item.price;
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
      prepTimeMinutes: item.prepTimeMinutes,
      ingredients: item.ingredients,
    };
  });

export const createOrder = asyncHandler(async (req, res) => {
  const { branch, table, room, customerId, customerName, items, couponCode, paymentMethod, source, note } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  const ids = [...new Set(items.map((i) => i.menuItem))];
  const menuItems = await MenuItem.find({ _id: { $in: ids }, branch }).select('+ingredientLinks');

  const serverItems = buildServerItems(menuItems, items);
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode, branch, active: true });
    if (!coupon || (coupon.expiresAt && coupon.expiresAt < new Date()) || coupon.usedCount >= coupon.maxUses) {
      throw new AppError('Invalid or expired coupon', 400);
    }
    if (serverItems.reduce((s, i) => s + i.subtotal, 0) < coupon.minOrder) {
      throw new AppError(`Coupon requires a minimum order of ${coupon.minOrder}`, 400);
    }
    coupon.usedCount += 1;
    await coupon.save();
  }

  const totals = await orderService.computeTotals(serverItems, coupon);

  const order = await orderService.createOrder({
    branch,
    table,
    room,
    customerId,
    customerName,
    items: serverItems,
    source,
    note,
  });

  order.subtotal = totals.subtotal;
  order.discount = totals.discount;
  order.couponCode = coupon?.code || '';
  order.tax = totals.tax;
  order.total = totals.total;
  await order.save();

  const emitted = await Order.findById(order._id)
    .populate('table', 'number label')
    .populate('room', 'number');
  notificationService.branch(branch, 'order:new', emitted);
  if (customerId) notificationService.guest(customerId, 'order:created', emitted);

  if (paymentMethod === 'cash') {
    const { order: confirmed } = await orderService.confirmOrder(order, customerName || 'Guest');
    if (table) await Table.findByIdAndUpdate(table, { status: 'occupied' });
    if (room) await Room.findByIdAndUpdate(room, { status: 'occupied' });
    return res.status(201).json({ success: true, data: { order: confirmed, payment: null } });
  }

  // Online payment — amount is verified server-side against the DB.
  await orderService.transition(order, 'PAYMENT_PENDING', customerName || 'Guest');
  const result = await paymentService.processPayment(order, paymentMethod, order.total);
  if (!result.success) {
    order.status = 'CANCELLED';
    order.cancelledReason = `Payment failed: ${result.reason || 'Gateway declined'}`;
    order.statusHistory.push({ status: 'CANCELLED', by: 'system', note: result.reason, at: new Date() });
    await order.save();
    throw new AppError(result.reason || 'Payment failed', 402);
  }

  const { order: confirmed } = await orderService.confirmOrder(order, 'payment');
  if (table) await Table.findByIdAndUpdate(table, { status: 'occupied' });
  if (room) await Room.findByIdAndUpdate(room, { status: 'occupied' });

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
  const filter = { branch };
  if (status) filter.status = status;
  const orders = await Order.find(filter)
    .populate('table', 'number label')
    .populate('room', 'number')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10));
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
  if (to === 'COMPLETED') {
    if (order.table) await Table.findByIdAndUpdate(order.table, { status: 'available' });
  }
  res.json({ success: true, data: order });
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
  const by = req.user?.name || order.customerName || 'Guest';
  const result = await orderService.cancelOrder(order, by, reason || 'Cancelled by customer');
  if (order.table) await Table.findByIdAndUpdate(order.table, { status: 'available' });
  res.json({ success: true, data: result });
});

export const waiterDeliver = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) throw new AppError('Order not found', 404);
  if (order.status !== 'READY') throw new AppError('Order is not ready for delivery', 400);
  await orderService.transition(order, 'OUT_FOR_DELIVERY', req.user?.name || 'waiter');
  res.json({ success: true, data: order });
});
