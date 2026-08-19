import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: 100, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ branch: 1, code: 1 }, { unique: true });

export default mongoose.model('Coupon', couponSchema);
