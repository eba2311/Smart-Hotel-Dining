import Table from '../models/Table.js';
import Room from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { randomToken } from '../utils/helpers.js';
import { generateQRDataUrl, qrUrl } from '../services/qr/qrService.js';

const attachToken = (doc) => {
  if (!doc.qrToken) doc.qrToken = randomToken(20);
};

export const listTables = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch } : {};
  const tables = await Table.find(filter).sort({ number: 1 });
  res.json({ success: true, data: tables });
});

export const createTable = asyncHandler(async (req, res) => {
  const table = await Table.create({ ...req.body, qrToken: randomToken(20) });
  res.status(201).json({ success: true, data: table });
});

export const updateTable = asyncHandler(async (req, res) => {
  const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!table) throw new AppError('Table not found', 404);
  res.json({ success: true, data: table });
});

export const deleteTable = asyncHandler(async (req, res) => {
  const t = await Table.findByIdAndDelete(req.params.id);
  if (!t) throw new AppError('Table not found', 404);
  res.json({ success: true, message: 'Table deleted' });
});

export const regenerateTableQr = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw new AppError('Table not found', 404);
  table.qrToken = randomToken(20);
  await table.save();
  const dataUrl = await generateQRDataUrl(qrUrl(table.qrToken));
  res.json({ success: true, data: { table, qrDataUrl: dataUrl, url: qrUrl(table.qrToken) } });
});

export const listRooms = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch } : {};
  const rooms = await Room.find(filter).sort({ number: 1 });
  res.json({ success: true, data: rooms });
});

export const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create({ ...req.body, qrToken: randomToken(20) });
  res.status(201).json({ success: true, data: room });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, data: room });
});

export const deleteRoom = asyncHandler(async (req, res) => {
  const r = await Room.findByIdAndDelete(req.params.id);
  if (!r) throw new AppError('Room not found', 404);
  res.json({ success: true, message: 'Room deleted' });
});

export const regenerateRoomQr = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found', 404);
  room.qrToken = randomToken(20);
  await room.save();
  const dataUrl = await generateQRDataUrl(qrUrl(room.qrToken));
  res.json({ success: true, data: { room, qrDataUrl: dataUrl, url: qrUrl(room.qrToken) } });
});

export const qrData = asyncHandler(async (req, res) => {
  const { kind, id } = req.params;
  const model = kind === 'table' ? Table : Room;
  const doc = await model.findById(id);
  if (!doc) throw new AppError('Not found', 404);
  attachToken(doc);
  await doc.save();
  const dataUrl = await generateQRDataUrl(qrUrl(doc.qrToken));
  res.json({ success: true, data: { qrDataUrl: dataUrl, url: qrUrl(doc.qrToken), token: doc.qrToken } });
});
