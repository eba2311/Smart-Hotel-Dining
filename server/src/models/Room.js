import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    number: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1 },
    roomType: { type: String, default: 'Standard' },
    qrToken: { type: String, unique: true },
    status: { type: String, enum: ['vacant', 'occupied'], default: 'vacant' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ branch: 1, number: 1 }, { unique: true });

export default mongoose.model('Room', roomSchema);
