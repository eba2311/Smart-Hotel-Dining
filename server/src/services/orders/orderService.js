/**
 * Order lifecycle orchestration: creation, confirmation, kitchen handling,
 * delivery and completion. Emits real-time events through the notification
 * service and records a full status history timeline.
 */
import Order from '../../models/Order.js';
import KitchenTicket from '../../models/KitchenTicket.js';
import Table from '../../models/Table.js';
import Room from '../../models/Room.js';
import { nanoid } from 'nanoid';
import { validateTransition, canCancel } from './orderStateMachine.js';
import { notificationService } from '../notifications/notificationService.js';
import { inventoryService } from '../inventory/inventoryService.js';
import { config } from '../../config/env.js';
import { round2 } from '../../utils/helpers.js';

export const orderService = {
  async computeTotals(items, coupon) {
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
    const total = round2(subtotal - discount + tax);
    return { subtotal: round2(subtotal), discount: round2(discount), tax, total };
  },

  async createOrder({ branch, table, room, customerId, customerName, items, source, note }) {
    const orderNumber = `ORD-${nanoid(6).toUpperCase()}`;
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
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      source,
      note,
      estimatedMinutes: Math.max(...items.map((i) => i.prepTimeMinutes || 0), 0) + 5,
      statusHistory: [{ status: 'CREATED', by: customerName || 'Guest', at: new Date() }],
    });
    return order;
  },

  async transition(order, to, by = 'system', note = '') {
    validateTransition(order.status, to);
    order.status = to;
    order.statusHistory.push({ status: to, by, note, at: new Date() });
    await order.save();
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
    await inventoryService.consumeIngredientsForOrder(order);
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
      throw new Error('CANCEL_NOT_ALLOWED');
    }
    order.status = 'CANCELLED';
    order.cancelledReason = reason;
    order.statusHistory.push({ status: 'CANCELLED', by, note: reason, at: new Date() });
    if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
    await order.save();
    notificationService.order(order._id, 'order:status', order);
    notificationService.branch(order.branch, 'order:status', order);
    return order;
  },

  async handleKitchenTicket(orderId, action, user) {
    const order = await Order.findById(orderId).populate('table room');
    if (!order) throw new Error('ORDER_NOT_FOUND');
    let ticket = await KitchenTicket.findOne({ order: order._id });

    const map = {
      accept: 'KITCHEN_ACCEPTED',
      start: 'PREPARING',
      ready: 'READY',
    };
    const orderStatus = map[action];
    if (!orderStatus) throw new Error('BAD_KITCHEN_ACTION');

    if (ticket) {
      const ticketStatus = { KITCHEN_ACCEPTED: 'accepted', PREPARING: 'preparing', READY: 'ready' }[orderStatus];
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
