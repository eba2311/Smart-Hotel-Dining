import { Router } from 'express';
import {
  listHotels,
  createHotel,
  updateHotel,
  listBranches,
  createBranch,
  updateBranch,
  listUsers,
  listAuditLogs,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { createHotelSchema, createBranchSchema } from '../validators/index.js';

const router = Router();

router.get('/hotels', protect, restrictTo('admin'), listHotels);
router.post('/hotels', protect, restrictTo('admin'), validate(createHotelSchema), audit('hotel.create', (req) => req.body.name), createHotel);
router.patch('/hotels/:id', protect, restrictTo('admin'), audit('hotel.update', (req) => `hotel:${req.params.id}`), updateHotel);

router.get('/branches', protect, restrictTo('admin', 'manager'), listBranches);
router.post('/branches', protect, restrictTo('admin'), validate(createBranchSchema), audit('branch.create', (req) => req.body.name), createBranch);
router.patch('/branches/:id', protect, restrictTo('admin'), audit('branch.update', (req) => `branch:${req.params.id}`), updateBranch);

router.get('/users', protect, restrictTo('admin'), listUsers);
router.get('/audit-logs', protect, restrictTo('admin'), listAuditLogs);

export default router;
