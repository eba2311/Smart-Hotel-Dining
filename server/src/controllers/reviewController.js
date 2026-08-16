import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyzeFeedback } from '../services/ai/feedbackAnalysis.js';

export const createReview = asyncHandler(async (req, res) => {
  const { orderId, customerId, customerName, rating, comment } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const exists = await Review.findOne({ order: orderId });
  if (exists) throw new AppError('This order has already been reviewed', 400);

  const sentiment = analyzeFeedback(comment);

  const review = await Review.create({
    order: orderId,
    branch: order.branch,
    customerId: customerId || order.customerId,
    customerName: customerName || order.customerName || 'Guest',
    rating,
    comment,
    sentiment,
    analyzed: true,
  });

  order.rating = rating;
  if (order.status === 'COMPLETED') await order.save();
  else {
    order.rating = rating;
    await order.save();
  }

  res.status(201).json({ success: true, data: review });
});

export const listReviews = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch } : {};
  const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: reviews });
});

export const analyzeReview = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  res.json({ success: true, data: analyzeFeedback(comment) });
});
