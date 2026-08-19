export const fmtMoney = (n) => `${Number(n || 0).toLocaleString()} ETB`;

export const fmtTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (d) => `${fmtDate(d)} · ${fmtTime(d)}`;

export const guestId = () => {
  let id = localStorage.getItem('sh_guest');
  if (!id) {
    id = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('sh_guest', id);
  }
  return id;
};

export const ORDER_STATUS_LABEL = {
  CREATED: 'Created',
  PAYMENT_PENDING: 'Payment Pending',
  CONFIRMED: 'Confirmed',
  KITCHEN_ACCEPTED: 'Kitchen Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUS_COLOR = {
  CREATED: 'bg-slate-100 text-slate-700',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-sky-100 text-sky-700',
  KITCHEN_ACCEPTED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-violet-100 text-violet-700',
  READY: 'bg-emerald-100 text-emerald-700',
  OUT_FOR_DELIVERY: 'bg-teal-100 text-teal-700',
  DELIVERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-emerald-600 text-white',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export const TRANSITIONS = {
  CREATED: ['CONFIRMED', 'CANCELLED'],
  PAYMENT_PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['KITCHEN_ACCEPTED', 'CANCELLED'],
  KITCHEN_ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const nextSteps = (status) => TRANSITIONS[status] || [];

export const SERVICE_TYPE_LABEL = {
  housekeeping: 'Housekeeping',
  towels: 'Extra Towels',
  cleaning: 'Room Cleaning',
  maintenance: 'Maintenance',
  water: 'Water Request',
  room_service: 'Room Service',
  reception: 'Call Reception',
};

export const SERVICE_TYPE_ICON = {
  housekeeping: '🧹',
  towels: '🧺',
  cleaning: '🛁',
  maintenance: '🔧',
  water: '💧',
  room_service: '🍽️',
  reception: '📞',
};
