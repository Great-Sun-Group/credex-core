import sharp from "sharp";
import { logInfo, logError } from "../utils/logger";

/**
 * Resize an image to a specific width
 * @param imageBuffer - The image buffer to resize
 * @param width - The target width
 * @param options - Additional options for resizing
 * @returns A buffer containing the resized image
 */
export async function resizeImage(
  imageBuffer: Buffer,
  width: number,
  options: {
    height?: number;
    fit?: keyof typeof sharp.fit;
    position?: keyof typeof sharp.gravity;
    background?: sharp.Color;
    withoutEnlargement?: boolean;
    quality?: number;
  } = {}
): Promise<Buffer> {
  try {
    const {
      height,
      fit = "inside",
      position = "centre",
      background = { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement = true,
      quality = 80
    } = options;

    const resizedImageBuffer = await sharp(imageBuffer)
      .resize({
        width,
        height,
        fit,
        position,
        background,
        withoutEnlargement
      })
      .jpeg({ quality })
      .toBuffer();

    logInfo(`Image resized to ${width}px width`, {
      originalSize: imageBuffer.length,
      resizedSize: resizedImageBuffer.length,
      width,
      height
    });

    return resizedImageBuffer;
  } catch (error) {
    logError("Error resizing image", error instanceof Error ? error : new Error(String(error)), {
      width,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Failed to resize image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Optimize a JPEG image
 * @param imageBuffer - The image buffer to optimize
 * @param quality - The JPEG quality (1-100)
 * @returns A buffer containing the optimized image
 */
export async function optimizeJpeg(imageBuffer: Buffer, quality = 85): Promise<Buffer> {
  try {
    const optimizedImageBuffer = await sharp(imageBuffer)
      .jpeg({ quality })
      .toBuffer();

    logInfo(`Image optimized`, {
      originalSize: imageBuffer.length,
      optimizedSize: optimizedImageBuffer.length,
      quality
    });

    return optimizedImageBuffer;
  } catch (error) {
    logError("Error optimizing JPEG", error instanceof Error ? error : new Error(String(error)), {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Failed to optimize JPEG: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process an image for AssetMarker storage
 * Creates original, 200px, and 600px versions
 * @param imageBuffer - The original image buffer
 * @returns An object containing the processed image buffers
 */
export async function processAssetMarkerImage(imageBuffer: Buffer): Promise<{
  original: Buffer;
  size200: Buffer;
  size600: Buffer;
}> {
  try {
    // Optimize the original image
    const optimizedOriginal = await optimizeJpeg(imageBuffer);
    
    // Create 200px version
    const size200 = await resizeImage(imageBuffer, 200, {
      height: 200,
      fit: "inside",
      quality: 80
    });
    
    // Create 600px version
    const size600 = await resizeImage(imageBuffer, 600, {
      height: 600,
      fit: "inside",
      quality: 85
    });
    
    return {
      original: optimizedOriginal,
      size200,
      size600
    };
  } catch (error) {
    logError("Error processing AssetMarker image", error instanceof Error ? error : new Error(String(error)), {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Failed to process AssetMarker image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
