import { z } from 'zod';
import { ROLES } from '../constants.js';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES).optional(),
  hotel: z.string().optional(),
  branch: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createCategorySchema = z.object({
  branch: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

const choiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceDelta: z.number().default(0),
});

const optionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['single', 'multi']).default('single'),
  required: z.boolean().default(false),
  choices: z.array(choiceSchema),
});

const ingredientLinkSchema = z.object({
  ingredient: z.string().optional(),
  quantity: z.number().default(0),
});

export const createMenuItemSchema = z.object({
  branch: z.string().min(1),
  category: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  price: z.number().min(0),
  promotionPrice: z.number().min(0).optional(),
  ingredients: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  calories: z.number().optional(),
  prepTimeMinutes: z.number().optional(),
  available: z.boolean().optional(),
  special: z.boolean().optional(),
  options: z.array(optionSchema).optional(),
  ingredientLinks: z.array(ingredientLinkSchema).optional(),
  sortOrder: z.number().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const createTableSchema = z.object({
  branch: z.string().min(1),
  number: z.string().min(1),
  label: z.string().optional(),
  seats: z.number().optional(),
  status: z.string().optional(),
});

export const createRoomSchema = z.object({
  branch: z.string().min(1),
  number: z.string().min(1),
  floor: z.number().optional(),
  roomType: z.string().optional(),
  status: z.string().optional(),
});

export const createOrderSchema = z.object({
  branch: z.string().min(1),
  table: z.string().optional(),
  room: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  source: z.string().optional(),
  note: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['card', 'mobile_money', 'bank', 'cash']).default('cash'),
  items: z
    .array(
      z.object({
        menuItem: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        options: z
          .array(
            z.object({
              optionId: z.string(),
              choiceIds: z.array(z.string()),
            })
          )
          .optional(),
        note: z.string().optional(),
      })
    )
    .min(1),
});

export const updateStatusSchema = z.object({
  to: z.string().min(1),
  note: z.string().optional(),
});

export const kitchenActionSchema = z.object({
  action: z.enum(['accept', 'start', 'ready']),
});

export const cancelOrderSchema = z.object({
  reason: z.string().optional(),
});

export const createServiceSchema = z.object({
  branch: z.string().min(1),
  room: z.string().optional(),
  table: z.string().optional(),
  guestName: z.string().optional(),
  customerId: z.string().optional(),
  type: z.enum(['housekeeping', 'towels', 'cleaning', 'maintenance', 'water', 'room_service', 'reception']),
  note: z.string().optional(),
});

export const updateServiceSchema = z
  .object({
    status: z.enum(['accepted', 'processing', 'completed', 'cancelled']).optional(),
    assignedTo: z.string().optional(),
    priority: z.number().optional(),
    note: z.string().optional(),
  })
  .partial();

export const createReviewSchema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const createIngredientSchema = z.object({
  branch: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().optional(),
  stock: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  costPerUnit: z.number().optional(),
});

export const restockSchema = z.object({
  quantity: z.number().min(0.01),
  branch: z.string().optional(),
});

export const adjustStockSchema = z.object({
  stock: z.number().min(0),
  branch: z.string().optional(),
});

export const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES),
  hotel: z.string().optional(),
  branch: z.string().optional(),
  phone: z.string().optional(),
});

export const updateStaffSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(['manager', 'waiter', 'kitchen', 'admin']).optional(),
    branch: z.string().optional(),
    active: z.boolean().optional(),
    password: z.string().min(8).optional(),
  })
  .partial();

export const createHotelSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  logo: z.string().optional(),
});

export const createBranchSchema = z.object({
  hotel: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['restaurant', 'bar', 'room_service']).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const createCouponSchema = z.object({
  branch: z.string().min(1),
  code: z.string().min(3),
  type: z.enum(['percent', 'fixed']).default('percent'),
  value: z.number().positive(),
  minOrder: z.number().default(0),
  maxUses: z.number().default(100),
  expiresAt: z.string().optional(),
});

export const analyzeSchema = z.object({
  comment: z.string().default(''),
});
