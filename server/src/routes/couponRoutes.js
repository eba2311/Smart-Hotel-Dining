import { Router } from 'express';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/couponController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCouponSchema } from '../validators/index.js';

const router = Router();

router.get('/', protect, restrictTo('manager', 'admin'), listCoupons);
router.post('/', protect, restrictTo('manager', 'admin'), validate(createCouponSchema), createCoupon);
router.patch('/:id', protect, restrictTo('manager', 'admin'), updateCoupon);
router.delete('/:id', protect, restrictTo('manager', 'admin'), deleteCoupon);

export default router;
