import mongoose from 'mongoose';
import { config } from './config/env.js';
import { connectDb } from './config/db.js';
import { randomToken } from './utils/helpers.js';

import User from './models/User.js';
import Hotel from './models/Hotel.js';
import Branch from './models/Branch.js';
import Table from './models/Table.js';
import Room from './models/Room.js';
import MenuCategory from './models/MenuCategory.js';
import MenuItem from './models/MenuItem.js';
import Ingredient from './models/Ingredient.js';
import Coupon from './models/Coupon.js';
import Order from './models/Order.js';
import Review from './models/Review.js';
import AuditLog from './models/AuditLog.js';
import ServiceRequest from './models/ServiceRequest.js';
import Payment from './models/Payment.js';
import InventoryTransaction from './models/InventoryTransaction.js';
import KitchenTicket from './models/KitchenTicket.js';
import DemandForecast from './models/DemandForecast.js';

const clean = async () => {
  const models = [
    User, Hotel, Branch, Table, Room, MenuCategory, MenuItem, Ingredient, Coupon,
    Order, Review, AuditLog, ServiceRequest, Payment, InventoryTransaction,
    KitchenTicket, DemandForecast,
  ];
  for (const m of models) await m.deleteMany({});
};

const seed = async () => {
  await connectDb();
  await clean();
  console.log('🧹 Cleared existing data');

  // ── Organization ───────────────────────────────────────────────
  const hotel = await Hotel.create({
    name: 'Grand Palace Hotel',
    address: 'Bole Road, Addis Ababa',
    phone: '+251 111 234 567',
    email: 'info@grandpalace.et',
    logo: '🏨',
    currency: 'ETB',
  });

  const restaurant = await Branch.create({
    hotel: hotel._id,
    name: 'Grand Restaurant',
    type: 'restaurant',
    address: 'Lobby Level',
    phone: '+251 111 234 568',
  });
  const roomService = await Branch.create({
    hotel: hotel._id,
    name: 'Room Service',
    type: 'room_service',
    address: 'All Floors',
  });

  // ── Staff users ────────────────────────────────────────────────
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@hotel.com',
    password: 'Admin@123',
    role: 'admin',
    hotel: hotel._id,
  });
  const manager = await User.create({
    name: 'Daniel Manager',
    email: 'manager@hotel.com',
    password: 'Manager@123',
    role: 'manager',
    hotel: hotel._id,
    branch: restaurant._id,
  });
  await User.create({
    name: 'Sara Waiter',
    email: 'waiter@hotel.com',
    password: 'Waiter@123',
    role: 'waiter',
    hotel: hotel._id,
    branch: restaurant._id,
  });
  await User.create({
    name: 'Chef Alem',
    email: 'kitchen@hotel.com',
    password: 'Kitchen@123',
    role: 'kitchen',
    hotel: hotel._id,
    branch: restaurant._id,
  });

  // ── Tables ─────────────────────────────────────────────────────
  const tables = [];
  for (let i = 1; i <= 8; i++) {
    tables.push(
      await Table.create({
        branch: restaurant._id,
        number: String(i).padStart(2, '0'),
        label: `Table ${i}`,
        seats: i % 3 === 0 ? 4 : 2,
        qrToken: randomToken(20),
      })
    );
  }

  const rooms = [];
  for (let i = 101; i <= 105; i++) {
    rooms.push(
      await Room.create({
        branch: roomService._id,
        number: String(i),
        floor: 1,
        roomType: i % 2 === 0 ? 'Executive' : 'Standard',
        qrToken: randomToken(20),
      })
    );
  }

  // ── Ingredients ────────────────────────────────────────────────
  const defs = [
    ['Chicken Breast', 'g', 22000, 5000],
    ['Beef', 'g', 16000, 5000],
    ['Pasta', 'g', 26000, 6000],
    ['Flour', 'g', 30000, 5000],
    ['Cheese', 'g', 12000, 3000],
    ['Lettuce', 'g', 8000, 2000],
    ['Tomato', 'g', 12000, 3000],
    ['Onion', 'g', 15000, 3000],
    ['Cream Sauce', 'ml', 10000, 2000],
    ['Potatoes', 'g', 30000, 5000],
    ['Rice', 'g', 20000, 4000],
    ['Milk', 'ml', 15000, 3000],
    ['Cocoa', 'g', 5000, 1000],
    ['Oranges', 'g', 10000, 2500],
    ['Coffee Beans', 'g', 8000, 2000],
    ['Vegetables', 'g', 20000, 4000],
    ['Pepperoni', 'g', 5000, 1200],
    ['Eggs', 'unit', 2000, 300],
    ['Bread Bun', 'unit', 800, 150],
    ['Spring Roll Wrapper', 'g', 6000, 1500],
  ];

  const ingredients = {};
  for (const [name, unit, stock, low] of defs) {
    ingredients[name] = await Ingredient.create({
      branch: restaurant._id,
      name,
      unit,
      stock,
      lowStockThreshold: low,
      costPerUnit: Math.round((stock / 20) * 100) / 100,
    });
  }

  // ── Categories ─────────────────────────────────────────────────
  const catDefs = [
    ['Starters', 'Light bites to begin your meal', '🥗', 1],
    ['Main Courses', 'Hearty plated dishes', '🍲', 2],
    ['Burgers & Pizza', 'Chef favourites', '🍔', 3],
    ['Drinks', 'Fresh & refreshing', '🥤', 4],
    ['Desserts', 'Sweet endings', '🍰', 5],
  ];
  const cats = {};
  for (const [name, desc, icon, sortOrder] of catDefs) {
    cats[name] = await MenuCategory.create({ branch: restaurant._id, name, description: desc, icon, sortOrder });
  }

  // ── Menu items ─────────────────────────────────────────────────
  const itemDefs = [
    {
      category: 'Starters', name: 'Fresh Spring Rolls', price: 190, prep: 12, cal: 240, img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=60',
      desc: 'Crispy vegetable rolls served with sweet chilli dip.',
      ing: ['Spring Roll Wrapper', 'Vegetables'], allergens: ['Gluten'],
    },
    {
      category: 'Starters', name: 'French Fries', price: 120, prep: 8, cal: 320, img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=60',
      desc: 'Golden crispy fries with ketchup & mayo.',
      ing: ['Potatoes'], allergens: [],
    },
    {
      category: 'Starters', name: 'Chicken Soup', price: 210, prep: 15, cal: 180, img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=60',
      desc: 'Hearty chicken broth with vegetables and herbs.',
      ing: ['Chicken Breast', 'Vegetables'], allergens: [],
    },
    {
      category: 'Main Courses', name: 'Chicken Alfredo Pasta', price: 480, prep: 20, cal: 680, img: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=60',
      desc: 'Creamy fettuccine with grilled chicken and parmesan.',
      ing: ['Pasta', 'Chicken Breast', 'Cream Sauce', 'Cheese'], allergens: ['Dairy', 'Gluten'],
      special: true,
    },
    {
      category: 'Main Courses', name: 'Spaghetti Bolognese', price: 420, prep: 20, cal: 610, img: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?auto=format&fit=crop&w=600&q=60',
      desc: 'Classic Italian pasta with rich beef ragu.',
      ing: ['Pasta', 'Beef', 'Tomato', 'Onion'], allergens: ['Gluten'],
    },
    {
      category: 'Main Courses', name: 'Grilled Steak', price: 850, prep: 25, cal: 540, img: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=600&q=60',
      desc: 'Prime beef steak, grilled to order with rosemary butter.',
      ing: ['Beef', 'Potatoes', 'Vegetables'], allergens: [],
      special: true,
    },
    {
      category: 'Main Courses', name: 'Roasted Chicken', price: 520, prep: 30, cal: 490, img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=60',
      desc: 'Half roasted chicken with rice and seasonal vegetables.',
      ing: ['Chicken Breast', 'Rice', 'Vegetables'], allergens: [],
    },
    {
      category: 'Main Courses', name: 'Ethiopian Doro Wat', price: 490, prep: 25, cal: 520, img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=60',
      desc: 'Spicy chicken stew served with injera.',
      ing: ['Chicken Breast', 'Onion', 'Rice'], allergens: [],
    },
    {
      category: 'Burgers & Pizza', name: 'Chicken Burger', price: 450, prep: 18, cal: 560, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=60',
      desc: 'Crispy chicken fillet, cheese, lettuce and house sauce.',
      ing: ['Chicken Breast', 'Bread Bun', 'Cheese', 'Lettuce'], allergens: ['Gluten', 'Dairy'],
      options: [
        { id: 'chicken-extra', name: 'Extras', type: 'multi', required: false,
          choices: [
            { id: 'cheese', label: 'Extra cheese', priceDelta: 50 },
            { id: 'spicy', label: 'Spicy', priceDelta: 30 },
            { id: 'sauce', label: 'Extra sauce', priceDelta: 25 },
          ] },
        { id: 'chicken-remove', name: 'Remove', type: 'multi', required: false,
          choices: [{ id: 'onion', label: 'No onion', priceDelta: 0 }] },
      ],
    },
    {
      category: 'Burgers & Pizza', name: 'Beef Burger', price: 480, prep: 18, cal: 610, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=60',
      desc: 'Juicy beef patty, cheddar, tomato and crispy lettuce.',
      ing: ['Beef', 'Bread Bun', 'Cheese', 'Lettuce', 'Tomato'], allergens: ['Gluten', 'Dairy'],
      options: [
        { id: 'beef-extra', name: 'Extras', type: 'multi', required: false,
          choices: [
            { id: 'cheese', label: 'Extra cheese', priceDelta: 50 },
            { id: 'bacon', label: 'Extra beef', priceDelta: 80 },
          ] },
      ],
    },
    {
      category: 'Burgers & Pizza', name: 'Margherita Pizza', price: 620, prep: 22, cal: 700, img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=60',
      desc: 'Wood-fired base with tomato, mozzarella and basil.',
      ing: ['Flour', 'Cheese', 'Tomato'], allergens: ['Gluten', 'Dairy'],
      options: [
        { id: 'pizza-toppings', name: 'Toppings', type: 'multi', required: false,
          choices: [
            { id: 'cheese', label: 'Extra cheese', priceDelta: 60 },
            { id: 'chicken', label: 'Add chicken', priceDelta: 90 },
          ] },
      ],
    },
    {
      category: 'Burgers & Pizza', name: 'Pepperoni Pizza', price: 780, prep: 22, cal: 820, img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=60',
      desc: 'Loaded with pepperoni, mozzarella and tomato sauce.',
      ing: ['Flour', 'Cheese', 'Tomato', 'Pepperoni'], allergens: ['Gluten', 'Dairy'],
      special: true,
    },
    {
      category: 'Drinks', name: 'Fresh Orange Juice', price: 110, prep: 5, cal: 120, img: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=60',
      desc: 'Squeezed to order from fresh oranges.',
      ing: ['Oranges'], allergens: [],
    },
    {
      category: 'Drinks', name: 'Ethiopian Coffee', price: 80, prep: 5, cal: 10, img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=60',
      desc: 'Traditional ceremony-style dark roast.',
      ing: ['Coffee Beans', 'Milk'], allergens: ['Dairy'],
    },
    {
      category: 'Drinks', name: 'Mineral Water', price: 40, prep: 1, cal: 0, img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=60',
      desc: 'Chilled bottled mineral water.',
      ing: [], allergens: [],
    },
    {
      category: 'Drinks', name: 'Soft Drink', price: 70, prep: 1, cal: 140, img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=60',
      desc: 'Chilled carbonated soft drink.',
      ing: [], allergens: [],
    },
    {
      category: 'Desserts', name: 'Chocolate Cake', price: 180, prep: 10, cal: 420, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=60',
      desc: 'Rich layered chocolate cake with cocoa glaze.',
      ing: ['Flour', 'Cocoa', 'Milk', 'Eggs'], allergens: ['Gluten', 'Dairy', 'Eggs'],
    },
    {
      category: 'Desserts', name: 'Fruit Salad', price: 160, prep: 8, cal: 150, img: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=60',
      desc: 'Seasonal fresh fruits with honey and mint.',
      ing: ['Oranges', 'Vegetables'], allergens: [],
    },
  ];

  for (const def of itemDefs) {
    const ingredientLinks = def.ing
      .filter((name) => ingredients[name])
      .map((name) => {
        const qty = { 'Bread Bun': 1, Eggs: 1 }[name] || Math.round((20 + Math.random() * 60) * 10) / 10;
        return { ingredient: ingredients[name]._id, quantity: qty };
      });

    await MenuItem.create({
      branch: restaurant._id,
      category: cats[def.category]._id,
      name: def.name,
      description: def.desc,
      image: def.img,
      price: def.price,
      promotionPrice: def.special && def.price > 400 ? Math.round(def.price * 0.9) : undefined,
      ingredients: def.ing,
      allergens: def.allergens,
      calories: def.cal,
      prepTimeMinutes: def.prep,
      special: def.special || false,
      options: def.options || [],
      ingredientLinks,
      sortOrder: 0,
    });
  }

  // ── Coupon ─────────────────────────────────────────────────────
  await Coupon.create({
    branch: restaurant._id,
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minOrder: 300,
    maxUses: 500,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });

  console.log('✅ Seed complete');
  console.log('──────────────────────────────────────────────');
  console.log('  Admin   → admin@hotel.com / Admin@123');
  console.log('  Manager → manager@hotel.com / Manager@123');
  console.log('  Waiter  → waiter@hotel.com / Waiter@123');
  console.log('  Kitchen → kitchen@hotel.com / Kitchen@123');
  console.log(`  Coupon  → WELCOME10 (10% off over 300 ETB)`);
  console.log('──────────────────────────────────────────────');
  console.log(`  Tables: ${tables.length} | Rooms: ${rooms.length} | Menu items: ${itemDefs.length}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
