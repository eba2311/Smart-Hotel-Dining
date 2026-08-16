import { Router } from 'express';
import { createReview, listReviews, analyzeReview } from '../controllers/reviewController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema, analyzeSchema } from '../validators/index.js';

const router = Router();

router.post('/', validate(createReviewSchema), createReview);
router.post('/analyze', validate(analyzeSchema), analyzeReview);
router.get('/', protect, restrictTo('manager', 'admin'), listReviews);

export default router;
