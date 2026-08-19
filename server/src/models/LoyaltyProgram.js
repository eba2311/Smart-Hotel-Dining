import mongoose from 'mongoose';

const loyaltyProgramSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    visitCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastVisitDate: Date,
    joinedDate: {
      type: Date,
      default: () => new Date(),
    },
    birthDate: Date,
    preferences: {
      favoriteCategories: [String],
      dietaryRestrictions: [String],
      allergies: [String],
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      email: String,
      phone: String,
    },
    rewards: [
      {
        type: {
          type: String,
          enum: ['points', 'voucher', 'discount', 'freeItem'],
        },
        amount: Number,
        code: String,
        expiryDate: Date,
        used: {
          type: Boolean,
          default: false,
        },
        usedDate: Date,
        createdAt: {
          type: Date,
          default: () => new Date(),
        },
      },
    ],
    purchaseHistory: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
        },
        amount: Number,
        date: Date,
        items: [String],
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    suspendReason: String,
    suspendedUntil: Date,
  },
  { timestamps: true }
);

// Compound index for efficient queries
loyaltyProgramSchema.index({ branch: 1, customerId: 1 }, { unique: true });
loyaltyProgramSchema.index({ branch: 1, tier: 1 });
loyaltyProgramSchema.index({ branch: 1, totalSpent: -1 });

export default mongoose.model('LoyaltyProgram', loyaltyProgramSchema);
