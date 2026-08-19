import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    image: { type: String, default: '🍕' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    options: { type: [mongoose.Schema.Types.Mixed], default: [] },
    note: { type: String, default: '' },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const timelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: 'system' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    customerId: { type: String, default: '' },
    customerName: { type: String, default: 'Guest' },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    tax: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'CREATED', 'PAYMENT_PENDING', 'CONFIRMED', 'KITCHEN_ACCEPTED',
        'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED',
      ],
      default: 'CREATED',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    paymentMethod: { type: String, default: '' },
    statusHistory: [timelineEntrySchema],
    priority: { type: Number, default: 0 },
    estimatedMinutes: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5 },
    note: { type: String, default: '' },
    cancelledReason: { type: String, default: '' },
    source: { type: String, enum: ['qr', 'counter', 'room'], default: 'qr' },
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ branch: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export default mongoose.model('Order', orderSchema);
