import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.split(' ')[1];
  }
  if (!token) throw new AppError('Please log in to continue', 401);

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user || !user.active) throw new AppError('User account not found or deactivated', 401);
  req.user = user;
  next();
});

export const restrictTo = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
