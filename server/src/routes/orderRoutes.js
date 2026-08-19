import { Router } from 'express';
import {
  createOrder,
  getOrder,
  listOrders,
  guestHistory,
  guestLoyalty,
  smartEta,
  updateStatus,
  kitchenAction,
  cancelOrder,
  waiterDeliver,
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import {
  createOrderSchema,
  updateStatusSchema,
  kitchenActionSchema,
  cancelOrderSchema,
} from '../validators/index.js';

const router = Router();

router.post('/', orderLimiter, validate(createOrderSchema), createOrder);
router.get('/', protect, restrictTo('manager', 'admin', 'waiter', 'kitchen'), listOrders);
router.get('/history/:customerId', protect, guestHistory);
router.get('/loyalty/:customerId', protect, guestLoyalty);
router.get('/:id/smart-eta', protect, smartEta);
router.get('/:id', protect, getOrder);

router.patch('/:id/status', protect, restrictTo('manager', 'admin', 'waiter'), validate(updateStatusSchema), audit('order.status', (req) => `order:${req.params.id}`), updateStatus);
router.patch('/:id/kitchen', protect, restrictTo('kitchen', 'manager', 'admin'), validate(kitchenActionSchema), kitchenAction);
router.patch('/:id/deliver', protect, restrictTo('waiter', 'manager', 'admin'), waiterDeliver);
router.delete('/:id', protect, restrictTo('manager', 'admin', 'waiter', 'guest'), validate(cancelOrderSchema), audit('order.cancel', (req) => `order:${req.params.id}`), cancelOrder);

export default router;
