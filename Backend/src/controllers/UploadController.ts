import { Request, Response } from 'express';
import '../types/express';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { validateFileType, isSuspiciousFilename } from '../utils/fileValidator';
import { uploadToCloudinary } from '../config/cloudinary';
import logger from '../config/logger';

const UploadController = {
  /**
   * Upload a single image file.
   * Validates file type via magic bytes, checks for suspicious filenames,
   * uploads to Cloudinary, and returns the URL.
   */
  uploadImage: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();

    const file = req.file;
    if (!file) {
      logger.warn('Upload attempted without file', {
        userId: req.user.uid,
        ip: req.ip,
      });
      throw ApiError.badRequest('No file provided');
    }

    // Check suspicious filename
    if (isSuspiciousFilename(file.originalname)) {
      logger.warn('Suspicious upload attempt', {
        userId: req.user.uid,
        filename: file.originalname,
        reason: 'suspicious_filename',
        ip: req.ip,
      });
      throw ApiError.badRequest('File rejected: suspicious filename');
    }

    // Validate actual file content via magic bytes
    const validation = validateFileType(file.buffer);

    if (!validation.valid) {
      logger.warn('Upload rejected: invalid file type', {
        userId: req.user.uid,
        filename: file.originalname,
        claimedMime: file.mimetype,
        detectedType: validation.detectedType,
        reason: validation.reason,
        ip: req.ip,
      });
      throw ApiError.badRequest(
        validation.reason || 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      );
    }

    // Upload to Cloudinary
    logger.info('Uploading image to Cloudinary', {
      userId: req.user.uid,
      filename: file.originalname,
      size: file.size,
      detectedType: validation.detectedType,
    });

    const url = await uploadToCloudinary(file.buffer);

    logger.info('Upload successful', {
      userId: req.user.uid,
      filename: file.originalname,
      size: file.size,
      detectedType: validation.detectedType,
      url,
    });

    ApiResponse.success(res, { url }, 'Image uploaded successfully');
  }),
};

export default UploadController;
