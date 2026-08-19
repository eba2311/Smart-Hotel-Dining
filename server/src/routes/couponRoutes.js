import { Router } from 'express';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/couponController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCouponSchema, validateCouponSchema, updateCouponSchema } from '../validators/index.js';

const router = Router();

router.get('/', protect, restrictTo('manager', 'admin'), listCoupons);
router.post('/', protect, restrictTo('manager', 'admin'), validate(createCouponSchema), createCoupon);
router.post('/validate', validate(validateCouponSchema), validateCoupon);
router.patch('/:id', protect, restrictTo('manager', 'admin'), validate(updateCouponSchema), updateCoupon);
router.delete('/:id', protect, restrictTo('manager', 'admin'), deleteCoupon);

export default router;
