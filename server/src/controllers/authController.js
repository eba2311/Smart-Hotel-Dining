import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, hotel, branch } = req.body;
  const allowedRole = role === 'manager' || role === 'admin' ? role : 'guest';
  const user = await User.create({ name, email, password, role: allowedRole, hotel, branch });
  res.status(201).json({ success: true, data: user.toSafeJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.active) throw new AppError('Your account has been deactivated', 403);
  user.lastLogin = new Date();
  await user.save();
  const token = signToken(user);
  res.json({ success: true, token, data: user.toSafeJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});
