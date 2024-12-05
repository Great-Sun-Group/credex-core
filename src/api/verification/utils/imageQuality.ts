import sharp from 'sharp';

export interface BlurResult {
  isAcceptable: boolean;
  value: number;
  threshold: number;
  error?: string;
}

export interface LightingResult {
  isAcceptable: boolean;
  value: number;
  range?: {
    minBrightness: number;
    maxBrightness: number;
  };
  error?: string;
}

export const detectBlur = async (
  imageBuffer: Buffer, 
  threshold: number = 0.5
): Promise<BlurResult> => {
  try {
    // Convert image to grayscale and get pixel data
    const { data, info } = await sharp(imageBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Implement Laplacian variance for blur detection
    let variance = 0;
    const laplacian = [0, 1, 0, 1, -4, 1, 0, 1, 0];
    
    for (let y = 1; y < info.height - 1; y++) {
      for (let x = 1; x < info.width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * info.width + (x + kx));
            sum += data[idx] * laplacian[(ky + 1) * 3 + (kx + 1)];
          }
        }
        variance += sum * sum;
      }
    }
    
    const normalizedVariance = variance / (info.width * info.height);
    const isAcceptable = normalizedVariance >= threshold;

    return {
      isAcceptable,
      value: normalizedVariance,
      threshold
    };
  } catch (error) {
    return {
      isAcceptable: false,
      error: error instanceof Error ? error.message : 'Failed to analyze image blur'
    } as BlurResult;
  }
};

export const assessLighting = async (
  imageBuffer: Buffer,
  options = { minBrightness: 40, maxBrightness: 220 }
): Promise<LightingResult> => {
  try {
    const { data, info } = await sharp(imageBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate average brightness
    const sum = data.reduce((acc, val) => acc + val, 0);
    const averageBrightness = sum / (info.width * info.height);

    const isAcceptable = 
      averageBrightness >= options.minBrightness && 
      averageBrightness <= options.maxBrightness;

    return {
      isAcceptable,
      value: averageBrightness,
      range: {
        minBrightness: options.minBrightness,
        maxBrightness: options.maxBrightness
      }
    };
  } catch (error) {
    return {
      isAcceptable: false,
      error: error instanceof Error ? error.message : 'Failed to analyze image lighting'
    } as LightingResult;
  }
};
