import { validateFileType, isSuspiciousFilename } from '../utils/fileValidator';
import { testBuffers } from './helpers/testApp';

describe('fileValidator', () => {
  describe('validateFileType', () => {
    it('should accept a valid JPEG file', () => {
      const result = validateFileType(testBuffers.validJpeg);
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/jpeg');
      expect(result.reason).toBeUndefined();
    });

    it('should accept a valid PNG file', () => {
      const result = validateFileType(testBuffers.validPng);
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/png');
    });

    it('should accept a valid WebP file', () => {
      const result = validateFileType(testBuffers.validWebp);
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/webp');
    });

    it('should reject a fake JPEG (wrong magic bytes)', () => {
      const result = validateFileType(testBuffers.fakeJpeg);
      expect(result.valid).toBe(false);
      expect(result.detectedType).toBeNull();
      expect(result.reason).toBeDefined();
    });

    it('should reject a text file', () => {
      const result = validateFileType(testBuffers.textFile);
      expect(result.valid).toBe(false);
    });

    it('should reject an empty buffer', () => {
      const result = validateFileType(testBuffers.empty);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('empty');
    });

    it('should reject a buffer that is too small', () => {
      const result = validateFileType(testBuffers.tinyBuffer);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('empty or too small');
    });
  });

  describe('isSuspiciousFilename', () => {
    it('should flag double extension: photo.jpg.exe', () => {
      expect(isSuspiciousFilename('photo.jpg.exe')).toBe(true);
    });

    it('should flag null bytes in filename', () => {
      expect(isSuspiciousFilename('photo\0.jpg')).toBe(true);
    });

    it('should flag .php files', () => {
      expect(isSuspiciousFilename('shell.php')).toBe(true);
    });

    it('should flag .bat files', () => {
      expect(isSuspiciousFilename('virus.bat')).toBe(true);
    });

    it('should not flag normal image filenames', () => {
      expect(isSuspiciousFilename('photo.jpg')).toBe(false);
      expect(isSuspiciousFilename('screenshot.png')).toBe(false);
      expect(isSuspiciousFilename('image.webp')).toBe(false);
    });

    it('should flag empty filenames', () => {
      expect(isSuspiciousFilename('')).toBe(true);
    });

    it('should flag extremely long filenames', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      expect(isSuspiciousFilename(longName)).toBe(true);
    });

    it('should flag unicode direction override characters', () => {
      expect(isSuspiciousFilename('photo\u202Eexe.jpg')).toBe(true);
    });
  });
});
