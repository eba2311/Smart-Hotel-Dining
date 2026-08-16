import { Router } from 'express';
import {
  createServiceRequest,
  listServiceRequests,
  updateServiceRequest,
} from '../controllers/serviceController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createServiceSchema, updateServiceSchema } from '../validators/index.js';

const router = Router();

router.post('/', validate(createServiceSchema), createServiceRequest);
router.get('/', protect, restrictTo('manager', 'admin', 'waiter'), listServiceRequests);
router.patch('/:id', protect, restrictTo('manager', 'admin', 'waiter'), validate(updateServiceSchema), updateServiceRequest);

export default router;
