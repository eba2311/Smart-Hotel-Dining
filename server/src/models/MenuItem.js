import mongoose from 'mongoose';

const choiceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['single', 'multi'], default: 'single' },
    required: { type: Boolean, default: false },
    choices: [choiceSchema],
  },
  { _id: false }
);

const ingredientLinkSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
    quantity: { type: Number, default: 0 },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '🍕' },
    price: { type: Number, required: true, min: 0 },
    promotionPrice: { type: Number, min: 0 },
    ingredients: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    calories: { type: Number, default: 0 },
    prepTimeMinutes: { type: Number, default: 15 },
    available: { type: Boolean, default: true },
    special: { type: Boolean, default: false },
    options: { type: [optionSchema], default: [] },
    ingredientLinks: { type: [ingredientLinkSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ branch: 1, name: 1 }, { unique: true });

export default mongoose.model('MenuItem', menuItemSchema);
