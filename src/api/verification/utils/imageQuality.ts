import sharp from 'sharp';
import { BlurResult, LightingResult } from '../types';

export const detectBlur = async (buffer: Buffer, threshold: number): Promise<BlurResult> => {
  try {
    const { entropy } = await sharp(buffer)
      .greyscale()
      .stats();
    
    const blurScore = entropy || 0;

    return {
      isAcceptable: blurScore > threshold,
      value: blurScore,
      threshold
    };
  } catch (error) {
    return {
      isAcceptable: false,
      value: 0,
      threshold,
      error: 'Failed to analyze blur'
    };
  }
};

export const assessLighting = async (buffer: Buffer, range: { minBrightness: number; maxBrightness: number }): Promise<LightingResult> => {
  try {
    const { channels } = await sharp(buffer)
      .greyscale()
      .stats();
    
    const brightness = channels[0].mean || 0;

    return {
      isAcceptable: brightness >= range.minBrightness && brightness <= range.maxBrightness,
      value: brightness,
      range
    };
  } catch (error) {
    return {
      isAcceptable: false,
      value: 0,
      range,
      error: 'Failed to analyze lighting'
    };
  }
};
