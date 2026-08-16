import mongoose from 'mongoose';

const forecastItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String },
    expected: { type: Number, default: 0 },
    level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  },
  { _id: false }
);

const demandForecastSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    forecastFor: { type: String, required: true },
    items: [forecastItemSchema],
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

demandForecastSchema.index({ branch: 1, forecastFor: 1 }, { unique: true });

export default mongoose.model('DemandForecast', demandForecastSchema);
