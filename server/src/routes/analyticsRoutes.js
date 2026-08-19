import { Router } from 'express';
import {
  summary,
  revenueByPeriod,
  satisfaction,
  demandForecast,
  todayDemand,
  recommendations,
  feedbackAnalysis,
} from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { analyzeSchema } from '../validators/index.js';

const router = Router();

router.get('/summary', protect, restrictTo('manager', 'admin'), summary);
router.get('/revenue', protect, restrictTo('manager', 'admin'), revenueByPeriod);
router.get('/satisfaction', protect, restrictTo('manager', 'admin'), satisfaction);
router.get('/demand', protect, restrictTo('manager', 'admin'), demandForecast);
router.get('/demand/today', todayDemand);
router.get('/recommendations', recommendations);
router.post('/feedback/analyze', protect, restrictTo('manager', 'admin'), validate(analyzeSchema), feedbackAnalysis);

export default router;
