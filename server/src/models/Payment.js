import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_METHODS } from '../constants.js';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ETB' },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: 'pending' },
    provider: { type: String, default: 'mock' },
    providerRef: { type: String, default: '' },
    verifiedAt: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
