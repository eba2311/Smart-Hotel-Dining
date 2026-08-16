import mongoose from 'mongoose';
import { TABLE_STATUS } from '../constants.js';

const tableSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    number: { type: String, required: true, trim: true },
    label: { type: String, default: '' },
    seats: { type: Number, default: 2 },
    qrToken: { type: String, unique: true },
    status: { type: String, enum: TABLE_STATUS, default: 'available' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tableSchema.index({ branch: 1, number: 1 }, { unique: true });

export default mongoose.model('Table', tableSchema);
