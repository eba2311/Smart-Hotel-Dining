import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, me);

export default router;
