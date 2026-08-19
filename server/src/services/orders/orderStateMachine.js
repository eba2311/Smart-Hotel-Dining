/**
 * Advanced order state machine.
 *
 *   CREATED → PAYMENT_PENDING → CONFIRMED → KITCHEN_ACCEPTED → PREPARING
 *     → READY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
 *
 * Cancellation is only allowed from CREATED, PAYMENT_PENDING, CONFIRMED and KITCHEN_ACCEPTED.
 */
import { ORDER_FLOW, CANCELLABLE_FROM } from '../../constants.js';
import { AppError } from '../../utils/AppError.js';

export const transitionMap = {
  CREATED: ['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED'],
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

export const canTransition = (from, to) =>
  (transitionMap[from] || []).includes(to) && from !== to;

export const canCancel = (status) => CANCELLABLE_FROM.includes(status);

export const stepIndex = (status) => ORDER_FLOW.indexOf(status);

export const nextSteps = (status) => transitionMap[status] || [];

export function validateTransition(from, to) {
  if (!canTransition(from, to)) {
    const err = new AppError(`Cannot transition from ${from} to ${to}`, 400);
    err.details = { from, to };
    throw err;
  }
  return true;
}
