export const ROLES = ['admin', 'manager', 'waiter', 'kitchen', 'guest'];

export const ORDER_STATUS = {
  CREATED: 'CREATED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  KITCHEN_ACCEPTED: 'KITCHEN_ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const ORDER_FLOW = [
  'CREATED',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'KITCHEN_ACCEPTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
];

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHODS = ['card', 'mobile_money', 'bank', 'cash'];

export const SERVICE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const SERVICE_TYPES = [
  'housekeeping',
  'towels',
  'cleaning',
  'maintenance',
  'water',
  'room_service',
  'reception',
];

export const KITCHEN_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  CANCELLED: 'cancelled',
};

export const TABLE_STATUS = ['available', 'occupied', 'reserved'];

export const CANCELLABLE_FROM = ['CREATED', 'PAYMENT_PENDING', 'CONFIRMED', 'KITCHEN_ACCEPTED'];
