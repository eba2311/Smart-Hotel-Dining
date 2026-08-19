import { Router } from 'express';
import {
  listHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  listUsers,
  listAuditLogs,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { createHotelSchema, createBranchSchema, updateHotelSchema, updateBranchSchema } from '../validators/index.js';

const router = Router();

router.get('/hotels', protect, restrictTo('admin'), listHotels);
router.post('/hotels', protect, restrictTo('admin'), validate(createHotelSchema), audit('hotel.create', (req) => req.body.name), createHotel);
router.patch('/hotels/:id', protect, restrictTo('admin'), validate(updateHotelSchema), audit('hotel.update', (req) => `hotel:${req.params.id}`), updateHotel);
router.delete('/hotels/:id', protect, restrictTo('admin'), audit('hotel.delete', (req) => `hotel:${req.params.id}`), deleteHotel);

router.get('/branches', protect, restrictTo('admin', 'manager'), listBranches);
router.post('/branches', protect, restrictTo('admin'), validate(createBranchSchema), audit('branch.create', (req) => req.body.name), createBranch);
router.patch('/branches/:id', protect, restrictTo('admin'), validate(updateBranchSchema), audit('branch.update', (req) => `branch:${req.params.id}`), updateBranch);
router.delete('/branches/:id', protect, restrictTo('admin'), audit('branch.delete', (req) => `branch:${req.params.id}`), deleteBranch);

router.get('/users', protect, restrictTo('admin'), listUsers);
router.get('/audit-logs', protect, restrictTo('admin'), listAuditLogs);

export default router;
