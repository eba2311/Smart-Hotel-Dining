import mongoose from 'mongoose';
import Hotel from '../models/Hotel.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const BRANCH_RELATED_MODELS = [
  'MenuItem', 'MenuCategory', 'Table', 'Room',
  'Ingredient', 'InventoryTransaction', 'Coupon',
  'ServiceRequest', 'KitchenTicket', 'Order', 'Review',
  'Payment', 'DemandForecast',
];

async function cascadeDeleteBranches(filter) {
  const models = BRANCH_RELATED_MODELS
    .map((name) => { try { return mongoose.model(name); } catch { return null; } })
    .filter(Boolean);
  await Promise.all(models.map((M) => M.deleteMany(filter)));
  await User.updateMany(filter, { $unset: { branch: '' } }).catch((err) => {
    console.error('Failed to unset branch from users during cascade delete:', err.message);
  });
}

export const listHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find().sort({ name: 1 });
  res.json({ success: true, data: hotels });
});

export const createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create(req.body);
  res.status(201).json({ success: true, data: hotel });
});

export const updateHotel = asyncHandler(async (req, res) => {
  const { name, address, phone, email, logo, currency } = req.body;
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, { name, address, phone, email, logo, currency }, { new: true, runValidators: true });
  if (!hotel) throw new AppError('Hotel not found', 404);
  res.json({ success: true, data: hotel });
});

export const listBranches = asyncHandler(async (req, res) => {
  const { hotel } = req.query;
  const filter = hotel ? { hotel } : {};
  const branches = await Branch.find(filter).populate('hotel').sort({ name: 1 });
  res.json({ success: true, data: branches });
});

export const createBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.create(req.body);
  res.status(201).json({ success: true, data: branch });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const { name, type, address, phone, active } = req.body;
  const branch = await Branch.findByIdAndUpdate(req.params.id, { name, type, address, phone, active }, { new: true, runValidators: true });
  if (!branch) throw new AppError('Branch not found', 404);
  res.json({ success: true, data: branch });
});

export const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new AppError('Hotel not found', 404);
  const branchIds = (await Branch.find({ hotel: req.params.id }).select('_id')).map((b) => b._id);
  await Hotel.findByIdAndDelete(req.params.id);
  await Branch.deleteMany({ hotel: req.params.id });
  if (branchIds.length > 0) {
    await cascadeDeleteBranches({ branch: { $in: branchIds } });
  }
  res.json({ success: true, data: {} });
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) throw new AppError('Branch not found', 404);
  await cascadeDeleteBranches({ branch: req.params.id });
  res.json({ success: true, data: {} });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: logs });
});
