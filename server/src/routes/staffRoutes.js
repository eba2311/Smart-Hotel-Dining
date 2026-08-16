import { Router } from 'express';
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/staffController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { createStaffSchema, updateStaffSchema } from '../validators/index.js';

const router = Router();

router.get('/', protect, restrictTo('manager', 'admin'), listStaff);
router.post('/', protect, restrictTo('manager', 'admin'), validate(createStaffSchema), audit('staff.create', (req) => `user:${req.body.email}`), createStaff);
router.patch('/:id', protect, restrictTo('manager', 'admin'), validate(updateStaffSchema), audit('staff.update', (req) => `user:${req.params.id}`), updateStaff);
router.delete('/:id', protect, restrictTo('manager', 'admin'), audit('staff.delete', (req) => `user:${req.params.id}`), deleteStaff);

export default router;
