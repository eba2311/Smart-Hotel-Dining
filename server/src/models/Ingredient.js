import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, default: 'g' },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 500 },
    costPerUnit: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ingredientSchema.index({ branch: 1, name: 1 }, { unique: true });

ingredientSchema.methods.isLowStock = function () {
  return this.stock <= this.lowStockThreshold;
};

export default mongoose.model('Ingredient', ingredientSchema);
