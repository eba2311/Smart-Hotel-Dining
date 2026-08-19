import { Router } from 'express';
import { register, login, me, logout, updateProfile, changePassword } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '../validators/index.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, me);
router.post('/logout', protect, logout);
router.patch('/profile', protect, validate(updateProfileSchema), updateProfile);
router.patch('/password', protect, validate(changePasswordSchema), changePassword);

export default router;
