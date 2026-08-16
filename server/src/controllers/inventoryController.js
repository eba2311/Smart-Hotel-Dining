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
  const ing = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!ing) throw new AppError('Ingredient not found', 404);
  res.json({ success: true, data: ing });
});

export const deleteIngredient = asyncHandler(async (req, res) => {
  await Ingredient.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Ingredient deleted' });
});

export const restockIngredient = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const ing = await inventoryService.restock(req.params.branchId || req.body.branch, req.params.id, quantity, req.user);
  res.json({ success: true, data: ing });
});

export const adjustIngredient = asyncHandler(async (req, res) => {
  const { stock } = req.body;
  const ing = await inventoryService.adjust(req.params.branchId || req.body.branch, req.params.id, stock, req.user);
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
