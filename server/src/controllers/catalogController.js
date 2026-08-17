import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import Room from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { inventoryService } from '../services/inventory/inventoryService.js';

export const resolveQr = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const table = await Table.findOne({ qrToken: token }).populate('branch');
  const room = await Room.findOne({ qrToken: token }).populate('branch');
  const target = table || room;
  if (!target || !target.active) throw new AppError('Invalid or inactive QR code', 404);
  res.json({
    success: true,
    data: {
      kind: table ? 'table' : 'room',
      label: table ? `Table ${table.number}` : `Room ${room.number}`,
      id: target._id,
      number: target.number,
      branch: target.branch,
      branchName: target.branch?.name,
    },
  });
});

export const getCategories = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch, active: true } : {};
  const categories = await MenuCategory.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: categories });
});

export const getMenu = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  if (!branch) throw new AppError('branch is required', 400);
  await inventoryService.syncAvailability(branch);
  const categories = await MenuCategory.find({ branch, active: true }).sort({ sortOrder: 1, name: 1 });
  const items = await MenuItem.find({ branch, available: true, category: { $in: categories.map((c) => c._id) } })
    .populate('category')
    .sort({ sortOrder: 1, name: 1 });
  res.json({
    success: true,
    data: {
      categories,
      items: items.map((i) => ({
        ...i.toObject(),
        price: i.promotionPrice && i.promotionPrice < i.price ? i.promotionPrice : i.price,
        originalPrice: i.promotionPrice && i.promotionPrice < i.price ? i.price : null,
      })),
    },
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await MenuCategory.create(req.body);
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await MenuCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const used = await MenuItem.countDocuments({ category: req.params.id });
  if (used > 0) throw new AppError('Cannot delete a category that still has menu items', 400);
  const cat = await MenuCategory.findByIdAndDelete(req.params.id);
  if (!cat) throw new AppError('Category not found', 404);
  res.json({ success: true, message: 'Category deleted' });
});

export const createMenuItem = asyncHandler(async (req, res) => {
  if (!req.body.branch) throw new AppError('Branch is required', 400);
  if (!req.body.name) throw new AppError('Name is required', 400);
  if (!req.body.category) throw new AppError('Category is required', 400);
  if (req.body.price === undefined || req.body.price === null) throw new AppError('Price is required', 400);
  const item = await MenuItem.create(req.body);
  res.status(201).json({ success: true, data: item });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) throw new AppError('Menu item not found', 404);
  res.json({ success: true, data: item });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);
  if (item.image && item.image.includes('/uploads/')) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'uploads', path.basename(item.image));
      await fs.unlink(filePath).catch(() => {});
    } catch {}
  }
  res.json({ success: true, message: 'Menu item deleted' });
});

export const listAllMenu = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch } : {};
  const items = await MenuItem.find(filter).populate('category').sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: items });
});

export const bulkAvailability = asyncHandler(async (req, res) => {
  const { branch, available } = req.body;
  if (!branch) throw new AppError('Branch is required', 400);
  if (typeof available !== 'boolean') throw new AppError('available must be true or false', 400);
  const result = await MenuItem.updateMany({ branch }, { $set: { available } });
  res.json({ success: true, data: { modified: result.modifiedCount } });
});
