import mongoose from 'mongoose';
import { SERVICE_STATUS, SERVICE_TYPES } from '../constants.js';

const serviceRequestSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    guestName: { type: String, default: 'Guest' },
    customerId: { type: String },
    type: { type: String, enum: SERVICE_TYPES, required: true },
    note: { type: String, default: '' },
    status: { type: String, enum: Object.values(SERVICE_STATUS), default: 'pending' },
    priority: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ branch: 1, status: 1, createdAt: -1 });

export default mongoose.model('ServiceRequest', serviceRequestSchema);
