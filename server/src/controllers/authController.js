import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';

const blockedTokens = new Map();
const CLEANUP_INTERVAL = 60 * 60 * 1000;

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, expiresAt] of blockedTokens) {
    if (expiresAt <= now) blockedTokens.delete(token);
  }
}
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);

function blockToken(token) {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
    blockedTokens.set(token, expiresAt);
  } catch {
    blockedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
  }
}

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, hotel, branch } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 409);
  const user = await User.create({ name, email, password, role: 'guest', hotel, branch });
  const token = signToken(user);
  res.status(201).json({ success: true, token, data: user.toSafeJSON() });
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

export const logout = asyncHandler(async (req, res) => {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && auth.startsWith('Bearer ')) {
    blockToken(auth.split(' ')[1]);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found', 404);
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  res.json({ success: true, data: user.toSafeJSON() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new AppError('User not found', 404);
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }
  user.password = newPassword;
  await user.save();
  const token = signToken(user);
  res.json({ success: true, token, data: user.toSafeJSON() });
});

export function isTokenBlocked(token) {
  cleanupExpiredTokens();
  return blockedTokens.has(token);
}
