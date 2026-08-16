import mongoose from 'mongoose';
import { KITCHEN_STATUS } from '../constants.js';

const kitchenTicketSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    tableLabel: { type: String, default: '' },
    roomLabel: { type: String, default: '' },
    status: { type: String, enum: Object.values(KITCHEN_STATUS), default: 'pending' },
    priority: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

kitchenTicketSchema.index({ branch: 1, status: 1, createdAt: -1 });

export default mongoose.model('KitchenTicket', kitchenTicketSchema);
