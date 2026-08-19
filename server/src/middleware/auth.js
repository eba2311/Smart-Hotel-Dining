import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';
import { isTokenBlocked } from '../controllers/authController.js';

// Track active sessions for security monitoring
const activeSessions = new Map();

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.split(' ')[1];
  }
  if (!token) throw new AppError('Please log in to continue', 401);

  if (isTokenBlocked(token)) {
    throw new AppError('Token has been invalidated. Please log in again', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user || !user.active) throw new AppError('User account not found or deactivated', 401);

  // Check for suspicious activity (multiple sessions from different IPs)
  const sessionKey = `${user.id}_${decoded.iat}`;
  const currentIp = req.ip || req.connection.remoteAddress;

  if (activeSessions.has(sessionKey)) {
    const sessionData = activeSessions.get(sessionKey);
    if (sessionData.ip !== currentIp && config.nodeEnv === 'production') {
      console.warn(`⚠️ Session hijacking attempt detected for user ${user.id}: IP changed from ${sessionData.ip} to ${currentIp}`);
      // In production, you might want to invalidate the session here
    }
  } else {
    activeSessions.set(sessionKey, {
      ip: currentIp,
      userAgent: req.headers['user-agent'],
      createdAt: Date.now(),
    });
  }

  req.user = user;
  req.sessionId = sessionKey;
  next();
});

export const restrictTo = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };

/**
 * Enhanced session management
 */
export const invalidateUserSessions = (userId) => {
  for (const [key, data] of activeSessions.entries()) {
    if (key.startsWith(`${userId}_`)) {
      activeSessions.delete(key);
    }
  }
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
