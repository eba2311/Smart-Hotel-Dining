import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logo: { type: String, default: '🏨' },
    currency: { type: String, default: 'ETB' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Hotel', hotelSchema);
