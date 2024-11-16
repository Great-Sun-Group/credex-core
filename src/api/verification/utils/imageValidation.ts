import sharp from 'sharp';
import { FileUpload, ValidationResult } from '../types';
import { detectBlur, assessLighting } from './imageQuality';

export const validateImage = async (file: FileUpload): Promise<ValidationResult> => {
  try {
    // Basic validation
    if (file.size > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'File size exceeds 5MB limit',
        details: { size: file.size }
      };
    }
    
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'File must be JPG or PNG',
        details: { type: file.mimetype }
      };
    }
    
    // Enhanced image analysis
    const metadata = await sharp(file.buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Failed to read image dimensions',
        details: { width: metadata.width, height: metadata.height }
      };
    }

    const blurResult = await detectBlur(file.buffer, 0.5);
    const lightingResult = await assessLighting(file.buffer, {
      minBrightness: 40,
      maxBrightness: 220
    });
    
    if (!blurResult.isAcceptable) {
      return {
        isValid: false,
        error: 'Image is too blurry',
        details: { blur: blurResult }
      };
    }
    
    if (!lightingResult.isAcceptable) {
      return {
        isValid: false,
        error: 'Image lighting is inadequate',
        details: { lighting: lightingResult }
      };
    }

    if (metadata.width < 640 || metadata.height < 480) {
      return {
        isValid: false,
        error: 'Image resolution must be at least 640x480',
        details: { width: metadata.width, height: metadata.height }
      };
    }
    
    return { 
      isValid: true,
      qualityMetrics: {
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        blur: blurResult,
        lighting: lightingResult
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate image',
      details: {
        type: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};
