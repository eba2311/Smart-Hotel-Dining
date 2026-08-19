import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      index: true,
    },
    customerEmail: String,
    guestCount: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    reservationDate: {
      type: Date,
      required: true,
      index: true,
    },
    reservationTime: {
      type: String,
      required: true, // HH:MM format
    },
    duration: {
      type: Number,
      default: 120, // Minutes
    },
    notes: String,
    specialRequests: [String], // High chair, no onions, allergies, etc.
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'],
      default: 'pending',
      index: true,
    },
    confirmationCode: {
      type: String,
      unique: true,
      index: true,
    },
    seatedTime: Date,
    completedTime: Date,
    cancelReason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'staff', 'system'],
    },
    preOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    depositStatus: {
      type: String,
      enum: ['none', 'pending', 'paid', 'refunded'],
      default: 'none',
    },
    reminderSentAt: Date,
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: String,
  },
  { timestamps: true }
);

// Compound indexes
reservationSchema.index({ branch: 1, reservationDate: 1, reservationTime: 1 });
reservationSchema.index({ branch: 1, status: 1 });
reservationSchema.index({ customerPhone: 1, branch: 1 });

export default mongoose.model('Reservation', reservationSchema);
