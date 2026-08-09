/**
 * File validation utilities using magic bytes (file signatures).
 * Validates actual file content, not just the MIME type or extension.
 */

/** Known image magic byte signatures */
const MAGIC_SIGNATURES: { type: string; bytes: number[]; offset?: number }[] = [
  { type: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },  // GIF8
];

/** Allowed image types for upload */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface FileValidationResult {
  valid: boolean;
  detectedType: string | null;
  reason?: string;
}

/**
 * Validate file by checking magic bytes against known image signatures.
 * Returns the detected type and whether it's an allowed image format.
 */
export function validateFileType(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length < 4) {
    return { valid: false, detectedType: null, reason: 'File is empty or too small' };
  }

  for (const sig of MAGIC_SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;

    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (matches) {
      // Check WebP specifically: must also have "WEBP" at offset 8
      if (sig.type === 'image/webp') {
        if (buffer.length >= 12) {
          const webpMarker = buffer.slice(8, 12).toString('ascii');
          if (webpMarker !== 'WEBP') continue;
        } else {
          continue;
        }
      }

      const isAllowed = ALLOWED_IMAGE_TYPES.has(sig.type);
      return {
        valid: isAllowed,
        detectedType: sig.type,
        reason: isAllowed ? undefined : `File type ${sig.type} is not allowed`,
      };
    }
  }

  return { valid: false, detectedType: null, reason: 'Unrecognized file type' };
}

/**
 * Check if a filename looks suspicious.
 * Catches double extensions, null bytes, and other tricks.
 */
export function isSuspiciousFilename(filename: string): boolean {
  if (!filename) return true;

  // Null byte injection
  if (filename.includes('\0')) return true;

  // Normalize to lowercase for checks
  const lower = filename.toLowerCase();

  // Dangerous extensions (even as intermediate extension)
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.msi', '.scr',
    '.ps1', '.vbs', '.js', '.php', '.py', '.sh',
    '.dll', '.sys', '.reg',
  ];

  // Check for dangerous extensions anywhere in the filename
  for (const ext of dangerousExtensions) {
    if (lower.includes(ext)) return true;
  }

  // Extremely long filenames
  if (filename.length > 255) return true;

  // Unicode direction override characters
  if (/[\u202A-\u202E\u2066-\u2069]/.test(filename)) return true;

  return false;
}
