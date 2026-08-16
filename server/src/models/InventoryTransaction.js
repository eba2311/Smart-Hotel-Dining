import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    type: { type: String, enum: ['in', 'out', 'adjustment'], required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, default: '' },
    refModel: { type: String, default: '' },
    refId: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);
