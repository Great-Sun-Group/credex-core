import sharp from 'sharp';
import { detectBlur, assessLighting } from '../utils/imageQuality';

const DEFAULT_CONFIG = {
  minWidth: 640,
  minHeight: 480,
  blurThreshold: 0.3,
  minBrightness: 0.2,
  maxBrightness: 0.8
};

export const validateImageQuality = async (
  imageBuffer: Buffer, 
  config = DEFAULT_CONFIG
) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    
    const qualityChecks = {
      dimensions: checkDimensions(metadata, config),
      blur: await detectBlur(imageBuffer, config.blurThreshold),
      lighting: await assessLighting(imageBuffer, {
        minBrightness: config.minBrightness,
        maxBrightness: config.maxBrightness
      })
    };

    return validateResults(qualityChecks);
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate image quality',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const checkDimensions = (metadata: sharp.Metadata, config: typeof DEFAULT_CONFIG) => ({
  isValid: metadata.width >= config.minWidth && metadata.height >= config.minHeight,
  width: metadata.width,
  height: metadata.height
});

const validateResults = (checks: any) => {
  if (!checks.dimensions.isValid) {
    return {
      isValid: false,
      error: 'Image dimensions too small',
      details: checks.dimensions
    };
  }

  if (!checks.blur.isAcceptable) {
    return {
      isValid: false,
      error: 'Image too blurry',
      details: checks.blur
    };
  }

  if (!checks.lighting.isAcceptable) {
    return {
      isValid: false,
      error: 'Poor lighting conditions',
      details: checks.lighting
    };
  }

  return {
    isValid: true,
    qualityMetrics: checks
  };
};
