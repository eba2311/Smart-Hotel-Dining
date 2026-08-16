import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['restaurant', 'bar', 'room_service'], default: 'restaurant' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Branch', branchSchema);
