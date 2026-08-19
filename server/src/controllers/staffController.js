import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listStaff = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = { ...(branch ? { branch } : {}), role: { $ne: 'guest' } };
  const staff = await User.find(filter).select('-password');
  res.json({ success: true, data: staff });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, role, hotel, branch, phone } = req.body;
  const assignable = req.user.role === 'admin'
    ? ['admin', 'manager', 'waiter', 'kitchen']
    : ['manager', 'waiter', 'kitchen'];
  if (!assignable.includes(role)) {
    throw new AppError('You cannot assign this role', 403);
  }
  const user = await User.create({ name, email, password, role, hotel, branch, phone });
  res.status(201).json({ success: true, data: user.toSafeJSON() });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  const { name, phone, role, branch, active, password } = req.body;
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role) {
    const assignable = req.user.role === 'admin'
      ? ['admin', 'manager', 'waiter', 'kitchen']
      : ['manager', 'waiter', 'kitchen'];
    if (!assignable.includes(role)) throw new AppError('You cannot assign this role', 403);
    user.role = role;
  }
  if (branch !== undefined) user.branch = branch;
  if (active !== undefined) user.active = active;
  if (password) user.password = password;
  await user.save();
  res.json({ success: true, data: user.toSafeJSON() });
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, message: 'User deleted' });
});
