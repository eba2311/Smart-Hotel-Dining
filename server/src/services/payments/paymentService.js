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
    if (Math.abs(order.total - clientAmount) > 0.01) {
      throw new Error('Payment amount mismatch detected — please refresh and retry');
    }
    const provider = createProvider(process.env.PAYMENT_PROVIDER || 'mock');

    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = await this.createPayment(order, method, order.total, meta);
    }

    payment.status = 'processing';
    await payment.save();

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
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    return payment;
  },
};
