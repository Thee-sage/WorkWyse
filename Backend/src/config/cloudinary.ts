import { v2 as cloudinary } from 'cloudinary';
import env from './env';
import logger from './logger';
import { ApiError } from '../utils/ApiError';

let configured = false;

/**
 * Lazily configure Cloudinary on first use.
 * Throws ApiError if credentials are missing.
 */
function ensureConfigured(): void {
  if (configured) return;

  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw ApiError.internal('Image upload is not configured. Missing Cloudinary credentials.');
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  configured = true;
  logger.info('Cloudinary configured successfully');
}

/**
 * Upload a buffer to Cloudinary.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder?: string; resourceType?: string } = {}
): Promise<string> {
  ensureConfigured();

  const { folder = 'workwyse/evidence', resourceType = 'image' } = options;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(ApiError.internal('Image upload timed out'));
    }, 15000);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType as any,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1200, crop: 'limit' },
        ],
      },
      (error, result) => {
        clearTimeout(timeout);
        if (error) {
          logger.error('Cloudinary upload failed', { error: error.message });
          reject(ApiError.internal('Image upload failed. Please try again.'));
          return;
        }
        if (!result?.secure_url) {
          logger.error('Cloudinary returned no URL', { result });
          reject(ApiError.internal('Image upload failed. Please try again.'));
          return;
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Reset configuration state (for testing).
 */
export function resetCloudinaryConfig(): void {
  configured = false;
}

export default cloudinary;
