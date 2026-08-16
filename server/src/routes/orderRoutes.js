import { Router } from 'express';
import {
  createOrder,
  getOrder,
  listOrders,
  guestHistory,
  updateStatus,
  kitchenAction,
  cancelOrder,
  waiterDeliver,
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import {
  createOrderSchema,
  updateStatusSchema,
  kitchenActionSchema,
  cancelOrderSchema,
} from '../validators/index.js';

const router = Router();

router.post('/', validate(createOrderSchema), createOrder);
router.get('/:id', getOrder);
router.get('/history/:customerId', guestHistory);
router.get('/', protect, restrictTo('manager', 'admin', 'waiter', 'kitchen'), listOrders);

router.patch('/:id/status', protect, restrictTo('manager', 'admin', 'waiter'), validate(updateStatusSchema), audit('order.status', (req) => `order:${req.params.id}`), updateStatus);
router.patch('/:id/kitchen', protect, restrictTo('kitchen', 'manager', 'admin'), validate(kitchenActionSchema), kitchenAction);
router.patch('/:id/deliver', protect, restrictTo('waiter', 'manager', 'admin'), waiterDeliver);
router.delete('/:id', protect, validate(cancelOrderSchema), audit('order.cancel', (req) => `order:${req.params.id}`), cancelOrder);

export default router;
