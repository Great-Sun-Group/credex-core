import sharp from "sharp";
import { logInfo, logError } from "../../utils/logger";

/**
 * Interface for image processing options
 */
export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  fit?: keyof typeof sharp.fit;
  position?: keyof typeof sharp.gravity;
  background?: sharp.Color;
  withoutEnlargement?: boolean;
  quality?: number;
}

/**
 * Interface for processed image versions
 */
export interface ProcessedImageVersions {
  original: Buffer;
  thumbnail: Buffer;
  size200: Buffer;
  size600: Buffer;
}

/**
 * Service for processing and transforming images
 * 
 * This service can be used as a standalone service or as part of a library
 * of user-generated services that can be shared with others.
 */
export class ImageProcessingService {
  /**
   * Resize an image to a specific width and height
   * @param imageBuffer - The image buffer to resize
   * @param options - Resize options
   * @returns A buffer containing the resized image
   */
  public async resizeImage(
    imageBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    try {
      const {
        width,
        height,
        fit = "inside",
        position = "centre",
        background = { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement = true,
        quality = 80
      } = options;

      if (!width && !height) {
        throw new Error("At least one of width or height must be specified");
      }

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

      logInfo(`Image resized to ${width}x${height}`, {
        service: "ImageProcessingService",
        method: "resizeImage",
        originalSize: imageBuffer.length,
        resizedSize: resizedImageBuffer.length,
        width,
        height
      });

      return resizedImageBuffer;
    } catch (error) {
      logError("Error resizing image", error instanceof Error ? error : new Error(String(error)), {
        service: "ImageProcessingService",
        method: "resizeImage",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Optimize a JPEG image
   * @param imageBuffer - The image buffer to optimize
   * @param quality - The JPEG quality (1-100)
   * @returns A buffer containing the optimized image
   */
  public async optimizeJpeg(imageBuffer: Buffer, quality = 85): Promise<Buffer> {
    try {
      const optimizedImageBuffer = await sharp(imageBuffer)
        .jpeg({ quality })
        .toBuffer();

      logInfo(`Image optimized with quality ${quality}`, {
        service: "ImageProcessingService",
        method: "optimizeJpeg",
        originalSize: imageBuffer.length,
        optimizedSize: optimizedImageBuffer.length,
        quality
      });

      return optimizedImageBuffer;
    } catch (error) {
      logError("Error optimizing JPEG", error instanceof Error ? error : new Error(String(error)), {
        service: "ImageProcessingService",
        method: "optimizeJpeg",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Convert an image to grayscale
   * @param imageBuffer - The image buffer to convert
   * @param quality - The JPEG quality (1-100)
   * @returns A buffer containing the grayscale image
   */
  public async convertToGrayscale(imageBuffer: Buffer, quality = 85): Promise<Buffer> {
    try {
      const grayscaleImageBuffer = await sharp(imageBuffer)
        .grayscale()
        .jpeg({ quality })
        .toBuffer();

      logInfo("Image converted to grayscale", {
        service: "ImageProcessingService",
        method: "convertToGrayscale",
        originalSize: imageBuffer.length,
        grayscaleSize: grayscaleImageBuffer.length,
        quality
      });

      return grayscaleImageBuffer;
    } catch (error) {
      logError("Error converting image to grayscale", error instanceof Error ? error : new Error(String(error)), {
        service: "ImageProcessingService",
        method: "convertToGrayscale",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Apply a blur effect to an image
   * @param imageBuffer - The image buffer to blur
   * @param sigma - The blur sigma (standard deviation of the Gaussian blur)
   * @param quality - The JPEG quality (1-100)
   * @returns A buffer containing the blurred image
   */
  public async blurImage(imageBuffer: Buffer, sigma = 3, quality = 85): Promise<Buffer> {
    try {
      const blurredImageBuffer = await sharp(imageBuffer)
        .blur(sigma)
        .jpeg({ quality })
        .toBuffer();

      logInfo(`Image blurred with sigma ${sigma}`, {
        service: "ImageProcessingService",
        method: "blurImage",
        originalSize: imageBuffer.length,
        blurredSize: blurredImageBuffer.length,
        sigma,
        quality
      });

      return blurredImageBuffer;
    } catch (error) {
      logError("Error blurring image", error instanceof Error ? error : new Error(String(error)), {
        service: "ImageProcessingService",
        method: "blurImage",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Rotate an image
   * @param imageBuffer - The image buffer to rotate
   * @param angle - The angle of rotation (multiple of 90)
   * @param quality - The JPEG quality (1-100)
   * @returns A buffer containing the rotated image
   */
  public async rotateImage(imageBuffer: Buffer, angle = 90, quality = 85): Promise<Buffer> {
    try {
      if (angle % 90 !== 0) {
        throw new Error("Angle must be a multiple of 90");
      }

      const rotatedImageBuffer = await sharp(imageBuffer)
        .rotate(angle)
        .jpeg({ quality })
        .toBuffer();

      logInfo(`Image rotated by ${angle} degrees`, {
        service: "ImageProcessingService",
        method: "rotateImage",
        originalSize: imageBuffer.length,
        rotatedSize: rotatedImageBuffer.length,
        angle,
        quality
      });

      return rotatedImageBuffer;
    } catch (error) {
      logError("Error rotating image", error instanceof Error ? error : new Error(String(error)), {
        service: "ImageProcessingService",
        method: "rotateImage",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process an image for AssetMarker storage
   * Creates original, thumbnail, 200px, and 600px versions
   * @param imageBuffer - The original image buffer
   * @returns An object containing the processed image buffers
   */
  public async processAssetMarkerImage(imageBuffer: Buffer): Promise<ProcessedImageVersions> {
    try {
      // Optimize the original image
      const optimizedOriginal = await this.optimizeJpeg(imageBuffer);
      
      // Create thumbnail version (50px)
      const thumbnail = await this.resizeImage(imageBuffer, {
        width: 50,
        height: 50,
        fit: "inside",
        quality: 75
      });
      
      // Create 200px version
      const size200 = await this.resizeImage(imageBuffer, {
        width: 200,
        height: 200,
        fit: "inside",
        quality: 80
      });
      
      // Create 600px version
      const size600 = await this.resizeImage(imageBuffer, {
        width: 600,
        height: 600,
        fit: "inside",
        quality: 85
      });
      
      logInfo("Processed asset marker image", {
        service: "ImageProcessingService",
        method: "processAssetMarkerImage",
        originalSize: imageBuffer.length,
        optimizedSize: optimizedOriginal.length,
        thumbnailSize: thumbnail.length,
        size200Size: size200.length,
        size600Size: size600.length
      });
      
      return {
        original: optimizedOriginal,
        thumbnail,
        size200,
        size600
      };
    } catch (error) {
      logError("Error processing asset marker image", error instanceof Error ? error : new Error(String(error)), {
        service: "ImageProcessingService",
        method: "processAssetMarkerImage",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get image metadata
   * @param imageBuffer - The image buffer
   * @returns The image metadata
   */
  public async getImageMetadata(imageBuffer: Buffer): Promise<sharp.Metadata> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      logInfo("Retrieved image metadata", {
        service: "ImageProcessingService",
        method: "getImageMetadata",
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length
      });
      
      return metadata;
    } catch (error) {
      logError("Error getting image metadata", error instanceof Error ? error : new Error(String(error)), {
        service: "ImageProcessingService",
        method: "getImageMetadata",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export a singleton instance
export const imageProcessingService = new ImageProcessingService();
