/**
 * Payment abstraction layer.
 *
 * The backend never trusts amounts sent from the browser: the amount is always
 * recomputed from the order stored in the database and verified here before a
 * payment is marked as paid.
 *
 * Providers are pluggable. The default "mock" provider simulates an external
 * gateway so the whole flow works without real credentials. To integrate a real
 * gateway, implement the `charge()` method and register it in `createProvider`.
 */
import Payment from '../../models/Payment.js';
import { randomCode } from '../../utils/helpers.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockProvider = {
  name: 'mock',
  async charge({ amount, method, ref }) {
    await sleep(1200);
    const random = Math.random();
    if (random < 0.9) {
      return { success: true, providerRef: `${method.toUpperCase()}-${randomCode(8)}` };
    }
    return { success: false, providerRef: `${method.toUpperCase()}-${randomCode(8)}`, reason: 'Card declined (simulated)' };
  },
};

const providers = {
  mock: mockProvider,
};

function createProvider(name) {
  return providers[name] || providers.mock;
}

export const paymentService = {
  async createPayment(order, method, amount, meta = {}) {
    const provider = createProvider(process.env.PAYMENT_PROVIDER || 'mock');
    const payment = await Payment.create({
      order: order._id,
      branch: order.branch,
      method,
      amount,
      currency: config.currency,
      status: 'pending',
      provider: provider.name,
      meta,
    });
    order.payment = payment._id;
    order.paymentMethod = method;
    order.paymentStatus = 'pending';
    await order.save();
    return payment;
  },

  /**
   * Initiates the charge. Amount is taken from the order document and must match
   * the client-sent amount, otherwise the request is rejected.
   */
  async processPayment(order, method, clientAmount, meta = {}) {
    const provider = createProvider(process.env.PAYMENT_PROVIDER || 'mock');

    let payment = await Payment.findOneAndUpdate(
      { order: order._id },
      { $setOnInsert: { branch: order.branch, method, amount: order.total, currency: config.currency, status: 'pending', provider: provider.name, meta } },
      { upsert: true, new: true, runValidators: true }
    );

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new AppError('Payment already processed for this order', 400);
    }

    payment.status = 'processing';
    await payment.save();

    if (!order.payment) {
      order.payment = payment._id;
      order.paymentMethod = method;
      order.paymentStatus = 'pending';
      await order.save();
    }

    const result = await provider.charge({ amount: order.total, method, ref: payment._id.toString() });

    if (result.success) {
      payment.status = 'paid';
      payment.providerRef = result.providerRef;
      payment.verifiedAt = new Date();
      await payment.save();
      order.paymentStatus = 'paid';
      await order.save();
      return { success: true, payment };
    }

    payment.status = 'failed';
    payment.providerRef = result.providerRef;
    await payment.save();
    order.paymentStatus = 'failed';
    await order.save();
    return { success: false, payment, reason: result.reason };
  },

  async verifyPayment(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    return payment;
  },
};
