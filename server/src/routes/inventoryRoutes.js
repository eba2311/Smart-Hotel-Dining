import { Router } from 'express';
import {
  listIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  restockIngredient,
  adjustIngredient,
  listTransactions,
} from '../controllers/inventoryController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createIngredientSchema, restockSchema, adjustStockSchema } from '../validators/index.js';

const router = Router();

router.get('/', protect, restrictTo('manager', 'admin'), listIngredients);
router.post('/', protect, restrictTo('manager', 'admin'), validate(createIngredientSchema), createIngredient);
router.patch('/:id', protect, restrictTo('manager', 'admin'), updateIngredient);
router.delete('/:id', protect, restrictTo('manager', 'admin'), deleteIngredient);
router.post('/:id/restock', protect, restrictTo('manager', 'admin'), validate(restockSchema), restockIngredient);
router.post('/:id/adjust', protect, restrictTo('manager', 'admin'), validate(adjustStockSchema), adjustIngredient);
router.get('/transactions/all', protect, restrictTo('manager', 'admin'), listTransactions);

export default router;
