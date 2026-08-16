import Coupon from '../models/Coupon.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listCoupons = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const coupons = await Coupon.find(branch ? { branch } : {}).sort({ createdAt: -1 });
  res.json({ success: true, data: coupons });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: String(req.body.code).toUpperCase() });
  res.status(201).json({ success: true, data: coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ success: true, data: coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Coupon deleted' });
});
