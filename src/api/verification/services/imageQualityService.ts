import { ImageQualityConfig, ImageValidationResult } from '../types';
import { analyzeImageQuality } from '../utils/aiImageQuality';
import { createHash } from 'crypto';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 });

const getImageHash = (buffer: Buffer): string => 
  createHash('sha256').update(buffer).digest('hex');

export const validateImage = async (
  imageBuffer: Buffer, 
  type: 'id' | 'selfie',
  config: ImageQualityConfig
): Promise<ImageValidationResult> => {
  const imageHash = getImageHash(imageBuffer);
  const cached = cache.get<ImageValidationResult>(imageHash);
  
  if (cached) {
    return cached;
  }

  const result = await performValidation(imageBuffer, type, config);
  cache.set(imageHash, result);
  return result;
};

const performValidation = async (
  imageBuffer: Buffer, 
  type: 'id' | 'selfie',
  config: ImageQualityConfig
): Promise<ImageValidationResult> => {
  try {
    const aiAnalysis = await analyzeImageQuality(imageBuffer, config, type);
    return {
      isValid: aiAnalysis.quality,
      details: {
        blur: {
          isAcceptable: aiAnalysis.quality,
          value: type === 'selfie' ? aiAnalysis.face?.confidence || 0 : aiAnalysis.document?.confidence || 0,
          threshold: config.blurThreshold
        },
        lighting: {
          isAcceptable: aiAnalysis.quality,
          value: type === 'selfie' ? aiAnalysis.face?.confidence || 0 : aiAnalysis.document?.confidence || 0,
          range: {
            minBrightness: config.minBrightness,
            maxBrightness: config.maxBrightness
          }
        },
        face: type === 'selfie' ? aiAnalysis.face : undefined,
        document: type === 'id' ? aiAnalysis.document : undefined
      }
    };
  } catch (error) {
    console.error('Image validation error:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
