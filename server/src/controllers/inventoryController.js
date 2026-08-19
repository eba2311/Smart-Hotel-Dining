import Ingredient from '../models/Ingredient.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { inventoryService } from '../services/inventory/inventoryService.js';

export const listIngredients = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch } : {};
  const ingredients = await Ingredient.find(filter).sort({ name: 1 });
  res.json({ success: true, data: ingredients });
});

export const createIngredient = asyncHandler(async (req, res) => {
  const ing = await Ingredient.create(req.body);
  res.status(201).json({ success: true, data: ing });
});

export const updateIngredient = asyncHandler(async (req, res) => {
  const { name, unit, stock, lowStockThreshold, costPerUnit, active } = req.body;
  const ing = await Ingredient.findByIdAndUpdate(req.params.id, { name, unit, stock, lowStockThreshold, costPerUnit, active }, { new: true, runValidators: true });
  if (!ing) throw new AppError('Ingredient not found', 404);
  res.json({ success: true, data: ing });
});

export const deleteIngredient = asyncHandler(async (req, res) => {
  const ing = await Ingredient.findByIdAndDelete(req.params.id);
  if (!ing) throw new AppError('Ingredient not found', 404);
  res.json({ success: true, message: 'Ingredient deleted' });
});

export const restockIngredient = asyncHandler(async (req, res) => {
  const { quantity, branch } = req.body;
  let branchId = branch;
  if (!branchId) {
    const existing = await Ingredient.findById(req.params.id).select('branch');
    if (existing) branchId = existing.branch;
  }
  if (!branchId) throw new AppError('Branch is required', 400);
  const ing = await inventoryService.restock(branchId, req.params.id, quantity, req.user);
  res.json({ success: true, data: ing });
});

export const adjustIngredient = asyncHandler(async (req, res) => {
  const { stock, branch } = req.body;
  let branchId = branch;
  if (!branchId) {
    const existing = await Ingredient.findById(req.params.id).select('branch');
    if (existing) branchId = existing.branch;
  }
  if (!branchId) throw new AppError('Branch is required', 400);
  const ing = await inventoryService.adjust(branchId, req.params.id, stock, req.user);
  res.json({ success: true, data: ing });
});

export const listTransactions = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch } : {};
  const tx = await InventoryTransaction.find(filter)
    .populate('ingredient', 'name unit')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ success: true, data: tx });
});
