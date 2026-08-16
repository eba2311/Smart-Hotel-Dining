import { Router } from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, restrictTo('manager', 'admin'), uploadImage);

export default router;
