import mongoose from 'mongoose';

const aspectSchema = new mongoose.Schema(
  {
    aspect: { type: String },
    sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
    score: { type: Number, default: 0 },
    keywords: { type: [String], default: [] },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    customerId: { type: String, default: '' },
    customerName: { type: String, default: 'Guest' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    sentiment: {
      overall: { type: String, enum: ['positive', 'negative', 'mixed', 'neutral'], default: 'neutral' },
      aspects: [aspectSchema],
      summary: { type: String, default: '' },
    },
    analyzed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ branch: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
