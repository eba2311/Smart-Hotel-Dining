import Hotel from '../models/Hotel.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find().sort({ name: 1 });
  res.json({ success: true, data: hotels });
});

export const createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create(req.body);
  res.status(201).json({ success: true, data: hotel });
});

export const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
  const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!branch) throw new AppError('Branch not found', 404);
  res.json({ success: true, data: branch });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: logs });
});
