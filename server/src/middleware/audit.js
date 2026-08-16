import AuditLog from '../models/AuditLog.js';

export const audit = (action, getTarget) =>
  async (req, res, next) => {
    try {
      const target = getTarget ? getTarget(req) : undefined;
      await AuditLog.create({
        user: req.user?._id,
        role: req.user?.role,
        action,
        target,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
      });
    } catch (err) {
      console.warn('Audit log failed:', err.message);
    }
    next();
  };
