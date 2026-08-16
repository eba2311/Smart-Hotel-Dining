import ServiceRequest from '../models/ServiceRequest.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notificationService } from '../services/notifications/notificationService.js';
import { SERVICE_STATUS } from '../constants.js';

export const createServiceRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.create({
    ...req.body,
    status: SERVICE_STATUS.PENDING,
  });
  notificationService.branch(req.body.branch, 'service:new', request);
  if (req.body.guestName) notificationService.guest(req.body.customerId, 'service:created', request);
  res.status(201).json({ success: true, data: request });
});

export const listServiceRequests = asyncHandler(async (req, res) => {
  const { branch, status } = req.query;
  const filter = { branch };
  if (status) filter.status = status;
  const requests = await ServiceRequest.find(filter)
    .populate('room', 'number')
    .populate('table', 'number label')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: requests });
});

export const updateServiceRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const request = await ServiceRequest.findById(id);
  if (!request) throw new AppError('Service request not found', 404);

  const valid = ['accepted', 'processing', 'completed', 'cancelled'];
  if (req.body.status && !valid.includes(req.body.status)) {
    throw new AppError('Invalid status', 400);
  }

  if (req.body.status === 'accepted') request.assignedTo = req.user?._id;
  if (req.body.status === 'completed') request.resolvedAt = new Date();

  Object.assign(request, req.body);
  await request.save();
  notificationService.branch(request.branch, 'service:update', request);
  res.json({ success: true, data: request });
});
