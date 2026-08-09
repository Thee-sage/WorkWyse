import express from 'express';
import multer from 'multer';
import UploadController from '../controllers/UploadController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { ApiError } from '../utils/ApiError';

/**
 * Multer config — memory storage, 2MB limit, image-only MIME filter.
 * The real file type validation happens via magic bytes in the controller.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Quick MIME check (actual validation via magic bytes happens later)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed'));
    }
  },
});

const router = express.Router();

// POST /api/upload — upload a single image
router.post(
  '/',
  authenticate,
  uploadLimiter,
  upload.single('file'),
  UploadController.uploadImage
);

export default router;
