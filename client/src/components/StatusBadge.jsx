import React from 'react';
import { clsx } from 'clsx';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, SERVICE_TYPE_LABEL } from '../lib/format.js';

export function OrderStatusBadge({ status }) {
  return (
    <span className={clsx('badge', ORDER_STATUS_COLOR[status] || 'bg-slate-100 text-slate-700')}>
      {ORDER_STATUS_LABEL[status] || status}
    </span>
  );
}

export function ServiceStatusBadge({ status }) {
  const colors = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-sky-100 text-sky-700',
    processing: 'bg-violet-100 text-violet-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };
  return <span className={clsx('badge capitalize', colors[status])}>{status}</span>;
}

export function ServiceTypeLabel({ type }) {
  return SERVICE_TYPE_LABEL[type] || type;
}
