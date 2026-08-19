import { Router } from 'express';
import {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  regenerateTableQr,
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  regenerateRoomQr,
  qrData,
} from '../controllers/tableController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTableSchema, createRoomSchema, updateTableSchema, updateRoomSchema } from '../validators/index.js';

const router = Router();

router.get('/tables', protect, restrictTo('manager', 'admin', 'waiter'), listTables);
router.post('/tables', protect, restrictTo('manager', 'admin'), validate(createTableSchema), createTable);
router.patch('/tables/:id', protect, restrictTo('manager', 'admin'), validate(updateTableSchema), updateTable);
router.delete('/tables/:id', protect, restrictTo('manager', 'admin'), deleteTable);
router.post('/tables/:id/qr/regenerate', protect, restrictTo('manager', 'admin'), regenerateTableQr);

router.get('/rooms', protect, restrictTo('manager', 'admin', 'waiter'), listRooms);
router.post('/rooms', protect, restrictTo('manager', 'admin'), validate(createRoomSchema), createRoom);
router.patch('/rooms/:id', protect, restrictTo('manager', 'admin'), validate(updateRoomSchema), updateRoom);
router.delete('/rooms/:id', protect, restrictTo('manager', 'admin'), deleteRoom);
router.post('/rooms/:id/qr/regenerate', protect, restrictTo('manager', 'admin'), regenerateRoomQr);

router.get('/qr/:kind/:id', protect, restrictTo('manager', 'admin'), qrData);

export default router;
