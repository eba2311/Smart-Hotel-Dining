import { AppError } from '../utils/AppError.js';

/**
 * Enhanced validation middleware with security features
 */
export const validate = (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.strip().safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new AppError('Validation failed', 400, details));
    }
    req[source] = result.data;
    next();
  };

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          // Remove potentially dangerous characters
          sanitized[key] = value
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+/gi, ''); // Remove event handlers like onclick
        } else if (typeof value === 'object') {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  };

  // Sanitize body, query, and params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

/**
 * Check for common attack patterns in request
 */
export const securityCheck = (req, res, next) => {
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /document\./gi,
    /window\./gi,
    /\.innerHTML/gi,
    /\.outerHTML/gi,
  ];

  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (checkString(key) || checkString(value)) return true;
        if (typeof value === 'object' && checkObject(value)) return true;
      }
    }
    return false;
  };

  // Check request data
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return next(new AppError('Suspicious input detected', 400));
  }

  next();
};

/**
 * Rate limiting by user/IP combination
 */
export const createUserRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [k, data] of requests.entries()) {
      if (data.timestamp < windowStart) {
        requests.delete(k);
      }
    }

    const userRequests = requests.get(key) || { count: 0, timestamp: now };

    if (userRequests.timestamp < windowStart) {
      userRequests.count = 0;
      userRequests.timestamp = now;
    }

    userRequests.count++;

    if (userRequests.count > max) {
      return next(new AppError('Too many requests. Please try again later.', 429));
    }

    requests.set(key, userRequests);
    next();
  };
};
