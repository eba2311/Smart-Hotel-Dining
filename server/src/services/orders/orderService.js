/**
 * Order lifecycle orchestration: creation, confirmation, kitchen handling,
 * delivery and completion. Emits real-time events through the notification
 * service and records a full status history timeline.
 */
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import KitchenTicket from '../../models/KitchenTicket.js';
import Table from '../../models/Table.js';
import Room from '../../models/Room.js';
import { nanoid } from 'nanoid';
import { validateTransition, canCancel } from './orderStateMachine.js';
import { notificationService } from '../notifications/notificationService.js';
import { inventoryService } from '../inventory/inventoryService.js';
import { config } from '../../config/env.js';
import { round2 } from '../../utils/helpers.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

export const orderService = {
  computeTotals(items, coupon, tip = 0) {
    if (!items || !Array.isArray(items)) return { subtotal: 0, discount: 0, tax: 0, tip: 0, total: 0 };
    let subtotal = 0;
    for (const item of items) {
      subtotal += round2(item.unitPrice * item.quantity);
    }
    let discount = 0;
    if (coupon) {
      discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
      discount = Math.min(discount, subtotal);
    }
    const tax = round2((subtotal - discount) * config.taxRate);
    const total = round2(subtotal - discount + tax + Number(tip || 0));
    return { subtotal: round2(subtotal), discount: round2(discount), tax, tip: round2(Number(tip || 0)), total };
  },

  async createOrder({ branch, table, room, customerId, customerName, items, source, note, idempotencyKey, totals, paymentMethod, couponCode }) {
    const orderNumber = `ORD-${nanoid(6).toUpperCase()}`;
    const maxPrep = items.length > 0 ? Math.max(...items.map((i) => i.prepTimeMinutes || 0)) : 0;
    const order = await Order.create({
      orderNumber,
      branch,
      table,
      room,
      customerId,
      customerName: customerName || 'Guest',
      items,
      status: 'CREATED',
      paymentStatus: 'pending',
      paymentMethod: paymentMethod || '',
      subtotal: totals?.subtotal || 0,
      discount: totals?.discount || 0,
      tax: totals?.tax || 0,
      tip: totals?.tip || 0,
      total: totals?.total || 0,
      couponCode: couponCode || '',
      source,
      note,
      idempotencyKey: idempotencyKey || null,
      estimatedMinutes: maxPrep + 5,
      statusHistory: [{ status: 'CREATED', by: customerName || 'Guest', at: new Date() }],
    });
    return order;
  },

  async transition(order, to, by = 'system', note = '') {
    validateTransition(order.status, to);
    const result = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: { status: to }, $push: { statusHistory: { status: to, by, note, at: new Date() } } },
      { new: true }
    );
    if (!result) {
      throw new AppError(`Order status already changed — cannot transition to ${to}`, 400);
    }
    Object.assign(order, result.toObject());
    const populated = await Order.findById(order._id)
      .populate('table', 'number label')
      .populate('room', 'number');
    notificationService.order(order._id, 'order:status', populated);
    notificationService.branch(order.branch, 'order:status', populated);
    return order;
  },

  /** Confirms the order: deducts inventory and creates a kitchen ticket. */
  async confirmOrder(order, by = 'system') {
    await this.transition(order, 'CONFIRMED', by);
    await Order.findByIdAndUpdate(order._id, { paymentStatus: 'paid' });
    try {
      await inventoryService.consumeIngredientsForOrder(order);
    } catch (err) {
      logger.error(`Inventory deduction failed for order ${order.orderNumber}:`, err);
    }
    const [table, room] = await Promise.all([
      order.table ? Table.findById(order.table).select('number') : null,
      order.room ? Room.findById(order.room).select('number') : null,
    ]);
    const ticket = await KitchenTicket.create({
      order: order._id,
      orderNumber: order.orderNumber,
      branch: order.branch,
      tableLabel: table ? `Table ${table.number}` : '',
      roomLabel: room ? `Room ${room.number}` : '',
      status: 'pending',
      priority: order.priority,
      items: order.items.map((i) => ({
        name: i.name,
        image: i.image,
        quantity: i.quantity,
        options: i.options,
        note: i.note,
      })),
    });
    notificationService.branch(order.branch, 'kitchen:new', { order, ticket });
    return { order, ticket };
  },

  async cancelOrder(order, by = 'system', reason = '') {
    if (!canCancel(order.status)) {
      throw new AppError('Order cannot be cancelled in its current status', 400);
    }
    const previousStatus = order.status;
    const result = await Order.findOneAndUpdate(
      { _id: order._id, status: previousStatus, cancelledReason: '' },
      { $set: { status: 'CANCELLED', cancelledReason: reason, paymentStatus: order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus }, $push: { statusHistory: { status: 'CANCELLED', by, note: reason, at: new Date() } } },
      { new: true }
    );
    if (!result) {
      throw new AppError('Order already cancelled or status changed', 400);
    }

    if (['CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING'].includes(previousStatus)) {
      try {
        await inventoryService.restoreIngredientsForOrder(result);
      } catch (err) {
        logger.error(`Failed to restore ingredients for cancelled order ${result.orderNumber}:`, err);
      }
      await KitchenTicket.findOneAndUpdate({ order: result._id }, { status: 'cancelled' });
    }

    if (result.couponCode && result.branch) {
      try {
        await Coupon.findOneAndUpdate({ code: result.couponCode, branch: result.branch }, { $inc: { usedCount: -1 } });
      } catch (err) {
        logger.error(`Failed to decrement coupon usedCount for cancelled order ${result.orderNumber}:`, err);
      }
    }

    if (result.table) {
      const otherActive = await Order.countDocuments({ table: result.table, status: { $in: ['CREATED', 'CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }, _id: { $ne: result._id } });
      if (otherActive === 0) await Table.findByIdAndUpdate(result.table, { status: 'available' });
    }
    if (result.room) {
      const otherActive = await Order.countDocuments({ room: result.room, status: { $in: ['CREATED', 'CONFIRMED', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }, _id: { $ne: result._id } });
      if (otherActive === 0) await Room.findByIdAndUpdate(result.room, { status: 'vacant' });
    }

    const populated = await Order.findById(result._id)
      .populate('table', 'number label')
      .populate('room', 'number');
    notificationService.order(result._id, 'order:status', populated);
    notificationService.branch(result.branch, 'order:status', populated);
    return result;
  },

  async handleKitchenTicket(orderId, action, user) {
    const order = await Order.findById(orderId).populate('table room');
    if (!order) throw new AppError('Order not found', 404);
    let ticket = await KitchenTicket.findOne({ order: order._id });

    const map = {
      accept: 'KITCHEN_ACCEPTED',
      start: 'PREPARING',
      ready: 'READY',
    };
    const orderStatus = map[action];
    if (!orderStatus) throw new AppError('Invalid kitchen action', 400);

    if (ticket) {
      const ticketStatus = { KITCHEN_ACCEPTED: 'accepted', PREPARING: 'preparing', READY: 'ready' }[orderStatus];
      if (ticket.status === ticketStatus) {
        throw new AppError(`Ticket already in ${ticketStatus} status`, 400);
      }
      ticket.status = ticketStatus;
      if (action === 'accept') ticket.assignedTo = user?._id;
      if (action === 'start') ticket.startedAt = new Date();
      if (action === 'ready') ticket.completedAt = new Date();
      await ticket.save();
    }

    await this.transition(order, orderStatus, user?.name || 'kitchen');
    if (action === 'ready') {
      notificationService.branch(order.branch, 'waiter:order-ready', order);
    }
    return { order, ticket };
  },
};
