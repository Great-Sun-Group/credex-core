import { ImageValidationResult } from '../../../../src/api/verification/types';

export const validateImage = jest.fn().mockImplementation(async (buffer: Buffer, type: 'id' | 'selfie'): Promise<ImageValidationResult> => {
  // Mock good quality selfie
  if (buffer.length === 16 && type === 'selfie') {
    return {
      isValid: true,
      details: {
        face: {
          hasFace: true,
          confidence: 95
        }
      }
    };
  }

  // Mock good quality ID
  if (buffer.length === 16 && type === 'id') {
    return {
      isValid: true,
      details: {
        document: {
          hasDocument: true,
          confidence: 95
        }
      }
    };
  }

  // Mock low resolution error
  if (buffer.length === 12) {
    return {
      isValid: false,
      error: 'Image dimensions too small'
    };
  }

  // Mock poor quality
  if (buffer.length === 8) {
    return {
      isValid: false,
      details: {
        face: {
          hasFace: true,
          confidence: 30
        }
      }
    };
  }

  return {
    isValid: false,
    error: 'Invalid image'
  };
});
