/**
 * Inventory service.
 *
 * Every menu item links to ingredients with a quantity. When an order is
 * confirmed, ingredients are deducted and an inventory transaction is recorded.
 * Items whose linked ingredients are insufficient are automatically marked
 * unavailable. Low-stock alerts are broadcast in real time.
 */
import Ingredient from '../../models/Ingredient.js';
import MenuItem from '../../models/MenuItem.js';
import InventoryTransaction from '../../models/InventoryTransaction.js';
import { notificationService } from '../notifications/notificationService.js';

export const inventoryService = {
  async consumeIngredientsForOrder(order) {
    const itemIds = order.items.map((i) => i.menuItem).filter(Boolean);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } }).select('ingredientLinks');

    const usage = new Map(); // ingredientId -> quantity used

    for (const mi of menuItems) {
      const qtyOrdered = order.items.find((o) => String(o.menuItem) === String(mi._id))?.quantity || 0;
      for (const link of mi.ingredientLinks || []) {
        if (!link.ingredient) continue;
        const key = String(link.ingredient);
        usage.set(key, (usage.get(key) || 0) + link.quantity * qtyOrdered);
      }
    }

    const lowStockIds = [];
    for (const [ingId, qty] of usage.entries()) {
      const ing = await Ingredient.findById(ingId);
      if (!ing) continue;
      ing.stock = Math.max(0, ing.stock - qty);
      await ing.save();
      await InventoryTransaction.create({
        branch: order.branch,
        ingredient: ing._id,
        type: 'out',
        quantity: qty,
        reason: `Order ${order.orderNumber}`,
        refModel: 'Order',
        refId: order._id,
      });
      if (ing.isLowStock()) lowStockIds.push(ing._id);
    }

    if (lowStockIds.length) {
      const low = await Ingredient.find({ _id: { $in: lowStockIds } }).select('name stock lowStockThreshold');
      notificationService.branch(order.branch, 'inventory:alert', {
        message: 'Some ingredients are running low',
        items: low,
      });
    }

    await this.syncAvailability(order.branch);
  },

  async syncAvailability(branchId) {
    const ingredients = await Ingredient.find({ branch: branchId });
    const byId = new Map(ingredients.map((i) => [String(i._id), i]));
    const items = await MenuItem.find({ branch: branchId, available: true }).populate('category');

    for (const item of items) {
      let ok = true;
      for (const link of item.ingredientLinks || []) {
        const ing = link.ingredient && byId.get(String(link.ingredient));
        if (ing && link.quantity > 0 && ing.stock < link.quantity) {
          ok = false;
          break;
        }
      }
      if (!ok && item.available) {
        item.available = false;
        await item.save();
      }
    }
  },

  async restock(branchId, ingredientId, quantity, user, reason = 'Restock') {
    const ing = await Ingredient.findOne({ _id: ingredientId, branch: branchId });
    if (!ing) throw new Error('INGREDIENT_NOT_FOUND');
    ing.stock += quantity;
    await ing.save();
    await InventoryTransaction.create({
      branch: branchId,
      ingredient: ing._id,
      type: 'in',
      quantity,
      reason,
      user: user?._id,
    });
    await this.syncAvailability(branchId);
    return ing;
  },

  async adjust(branchId, ingredientId, newStock, user, reason = 'Manual adjustment') {
    const ing = await Ingredient.findOne({ _id: ingredientId, branch: branchId });
    if (!ing) throw new Error('INGREDIENT_NOT_FOUND');
    const delta = newStock - ing.stock;
    ing.stock = Math.max(0, newStock);
    await ing.save();
    await InventoryTransaction.create({
      branch: branchId,
      ingredient: ing._id,
      type: 'adjustment',
      quantity: delta,
      reason,
      user: user?._id,
    });
    await this.syncAvailability(branchId);
    return ing;
  },
};
