import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export const uploadImage = asyncHandler(async (req, res) => {
  const { image } = req.body;
  if (!image || typeof image !== 'string') throw new AppError('image (data URL) is required', 400);

  const match = image.match(/^data:(image\/[a-z+]+);base64,(.+)$/s);
  if (!match) throw new AppError('Invalid image data URL', 400);

  const ext = MIME_EXT[match[1]];
  if (!ext) throw new AppError('Unsupported image type (use JPG, PNG, GIF or WebP)', 400);

  const buf = Buffer.from(match[2], 'base64');
  if (buf.length === 0) throw new AppError('Image file is empty', 400);
  if (buf.length > 8 * 1024 * 1024) throw new AppError('Image too large (max 8MB)', 413);

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `menu-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);

  res.status(201).json({ success: true, data: { url: `http://${req.get('host')}/uploads/${name}` } });
});
