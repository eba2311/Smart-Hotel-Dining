import Coupon from '../models/Coupon.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { round2 } from '../utils/helpers.js';
import { config } from '../config/env.js';

export const listCoupons = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const coupons = await Coupon.find(branch ? { branch } : {}).sort({ createdAt: -1 });
  res.json({ success: true, data: coupons });
});

export const createCoupon = asyncHandler(async (req, res) => {
  if (!req.body.code) throw new AppError('Coupon code is required', 400);
  const coupon = await Coupon.create({ ...req.body, code: String(req.body.code).toUpperCase() });
  res.status(201).json({ success: true, data: coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { code, type, value, minOrder, maxUses, expiresAt, active } = req.body;
  const update = { type, value, minOrder, maxUses, expiresAt, active };
  if (code !== undefined) update.code = String(code).toUpperCase();
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ success: true, data: coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ success: true, message: 'Coupon deleted' });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, branch, subtotal } = req.body;
  if (!code || !branch) throw new AppError('code and branch are required', 400);

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), branch, active: true });
  if (!coupon) throw new AppError('Coupon not found', 404);
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError('Coupon has expired', 400);
  }
  if (coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Coupon has reached its maximum uses', 400);
  }
  if (subtotal !== undefined && subtotal < coupon.minOrder) {
    throw new AppError(`Coupon requires a minimum order of ${coupon.minOrder}`, 400);
  }

  let discount = 0;
  const orderSubtotal = subtotal || 0;
  if (coupon.type === 'percent') {
    discount = round2(orderSubtotal * (coupon.value / 100));
  } else {
    discount = Math.min(coupon.value, orderSubtotal);
  }

  res.json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      discount,
      message: `Coupon applied! You save ${config.currency} ${discount.toFixed(2)}`,
    },
  });
});
