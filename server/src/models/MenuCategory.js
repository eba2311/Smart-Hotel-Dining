import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '🍽️' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuCategorySchema.index({ branch: 1, name: 1 }, { unique: true });

export default mongoose.model('MenuCategory', menuCategorySchema);
