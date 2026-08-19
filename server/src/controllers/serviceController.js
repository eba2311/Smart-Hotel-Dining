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
  const populated = await ServiceRequest.findById(request._id)
    .populate('room', 'number')
    .populate('table', 'number label');
  notificationService.branch(req.body.branch, 'service:new', populated);
  if (req.body.guestName) notificationService.guest(req.body.customerId, 'service:created', populated);
  res.status(201).json({ success: true, data: populated });
});

export const listServiceRequests = asyncHandler(async (req, res) => {
  const { branch, status } = req.query;
  const filter = branch ? { branch } : {};
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

  const { status, assignedTo, priority, note } = req.body;
  if (status && !Object.values(SERVICE_STATUS).includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  if (status) request.status = status;
  if (status === 'accepted' && assignedTo === undefined) {
    request.assignedTo = req.user?._id;
  }
  if (status === 'completed') request.resolvedAt = new Date();
  if (assignedTo !== undefined) request.assignedTo = assignedTo;
  if (priority !== undefined) request.priority = priority;
  if (note !== undefined) request.note = note;

  await request.save();
  const populated = await ServiceRequest.findById(request._id)
    .populate('room', 'number')
    .populate('table', 'number label');
  notificationService.branch(request.branch, 'service:update', populated);
  res.json({ success: true, data: populated });
});
