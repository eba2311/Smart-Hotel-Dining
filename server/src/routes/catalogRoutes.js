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
  bulkAvailability,
  getRecommendationsForGuest,
  getItemRatings,
  frequentlyCoOrdered,
  tableAvailability,
} from '../controllers/catalogController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  bulkAvailabilitySchema,
} from '../validators/index.js';

const router = Router();

// Public browsing
router.get('/qr/:token', resolveQr);
router.get('/menu', getMenu);
router.get('/categories', getCategories);
router.get('/recommendations', getRecommendationsForGuest);
router.get('/ratings', getItemRatings);
router.get('/co-ordered', frequentlyCoOrdered);
router.get('/tables', tableAvailability);

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
router.patch('/bulk-availability', protect, restrictTo('manager', 'admin'), validate(bulkAvailabilitySchema), audit('menuItem.bulkAvailability', (req) => `branch:${req.body.branch}`), bulkAvailability);

export default router;
