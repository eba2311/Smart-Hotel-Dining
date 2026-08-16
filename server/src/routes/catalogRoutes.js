import { Router } from 'express';
import {
  resolveQr,
  getCategories,
  getMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listAllMenu,
} from '../controllers/catalogController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from '../validators/index.js';

const router = Router();

// Public browsing
router.get('/qr/:token', resolveQr);
router.get('/menu', getMenu);
router.get('/categories', getCategories);

// Manager/admin management
router.get('/all', protect, restrictTo('manager', 'admin'), listAllMenu);
router.post(
  '/categories',
  protect,
  restrictTo('manager', 'admin'),
  validate(createCategorySchema),
  audit('category.create', (req) => req.body.name),
  createCategory
);
router.patch(
  '/categories/:id',
  protect,
  restrictTo('manager', 'admin'),
  validate(updateCategorySchema),
  audit('category.update', (req) => `category:${req.params.id}`),
  updateCategory
);
router.delete('/categories/:id', protect, restrictTo('manager', 'admin'), audit('category.delete', (req) => `category:${req.params.id}`), deleteCategory);
router.post(
  '/items',
  protect,
  restrictTo('manager', 'admin'),
  validate(createMenuItemSchema),
  audit('menuItem.create', (req) => req.body.name),
  createMenuItem
);
router.patch(
  '/items/:id',
  protect,
  restrictTo('manager', 'admin'),
  validate(updateMenuItemSchema),
  audit('menuItem.update', (req) => `menuItem:${req.params.id}`),
  updateMenuItem
);
router.delete('/items/:id', protect, restrictTo('manager', 'admin'), audit('menuItem.delete', (req) => `menuItem:${req.params.id}`), deleteMenuItem);

export default router;
