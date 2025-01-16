import sharp from 'sharp';
import { 
  RekognitionClient, 
  DetectFacesCommand,
  DetectLabelsCommand,
  QualityFilter,
  Attribute
} from '@aws-sdk/client-rekognition';
import {
  TextractClient,
  AnalyzeDocumentCommand,
  FeatureType
} from '@aws-sdk/client-textract';
import { ImageQualityConfig, ImageQualityResult } from '../types';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const textract = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Analyzes image quality using AWS services
 * @param imageBuffer - Buffer containing the image data
 * @param config - Configuration for quality thresholds
 * @param type - Type of image ('selfie' or 'id')
 * @returns Promise<ImageQualityResult>
 */
export async function analyzeImageQuality(
  imageBuffer: Buffer,
  config: ImageQualityConfig,
  type: 'selfie' | 'id'
): Promise<ImageQualityResult> {
  try {
    // Ensure image is in JPEG format
    const jpegBuffer = await ensureJPEGFormat(imageBuffer);

    // Validate image dimensions
    const metadata = await sharp(jpegBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      return {
        quality: false,
        error: 'Invalid image dimensions'
      };
    }

    if (metadata.width < config.minWidth || metadata.height < config.minHeight) {
      return {
        quality: false,
        error: `Image dimensions too small (min: ${config.minWidth}x${config.minHeight})`
      };
    }

    // Analyze based on image type
    if (type === 'selfie') {
      return await analyzeSelfieQuality(jpegBuffer, config);
    } else {
      return await analyzeDocumentQuality(jpegBuffer, config);
    }
  } catch (error) {
    console.error('AI Image Quality Analysis Error:', error);
    return {
      quality: false,
      error: 'Failed to analyze image quality'
    };
  }
}

/**
 * Analyzes selfie image quality
 */
async function analyzeSelfieQuality(
  imageBuffer: Buffer,
  config: ImageQualityConfig
): Promise<ImageQualityResult> {
  try {
    const params = {
      Image: {
        Bytes: imageBuffer
      },
      QualityFilter: QualityFilter.AUTO,
      Attributes: [Attribute.ALL]
    };

    const response = await rekognition.send(new DetectFacesCommand(params));
    const faceDetails = response.FaceDetails?.[0];

    if (!faceDetails) {
      return {
        quality: false,
        error: 'No face detected'
      };
    }

    const confidence = faceDetails.Confidence || 0;
    const brightness = faceDetails.Quality?.Brightness || 0;
    const sharpness = faceDetails.Quality?.Sharpness || 0;

    const isHighQuality = 
      confidence >= config.faceConfidenceThreshold &&
      brightness >= config.minBrightness &&
      brightness <= config.maxBrightness &&
      sharpness >= config.blurThreshold;

    return {
      quality: isHighQuality,
      face: {
        hasFace: true,
        confidence,
        boundingBox: faceDetails.BoundingBox,
        quality: {
          brightness,
          sharpness
        }
      },
      error: isHighQuality ? undefined : 'Image quality below threshold'
    };
  } catch (error) {
    console.error('Selfie Analysis Error:', error);
    return {
      quality: false,
      error: 'Failed to analyze selfie quality'
    };
  }
}

/**
 * Analyzes document image quality
 */
async function analyzeDocumentQuality(
  imageBuffer: Buffer,
  config: ImageQualityConfig
): Promise<ImageQualityResult> {
  try {
    // First detect if it's a document using Rekognition
    const rekognitionParams = {
      Image: {
        Bytes: imageBuffer
      },
      MaxLabels: 10
    };

    const rekognitionResponse = await rekognition.send(
      new DetectLabelsCommand(rekognitionParams)
    );

    const documentLabel = rekognitionResponse.Labels?.find(
      label => 
        label.Name?.toLowerCase().includes('id') ||
        label.Name?.toLowerCase().includes('card') ||
        label.Name?.toLowerCase().includes('document')
    );

    if (!documentLabel || (documentLabel.Confidence || 0) < config.documentConfidenceThreshold) {
      return {
        quality: false,
        error: 'No valid document detected'
      };
    }

    // Then analyze document structure with Textract
    const textractParams = {
      Document: {
        Bytes: imageBuffer
      },
      FeatureTypes: [FeatureType.FORMS]
    };

    const textractResponse = await textract.send(
      new AnalyzeDocumentCommand(textractParams)
    );

    const documentBlock = textractResponse.Blocks?.find(
      block => block.BlockType === 'PAGE'
    );

    if (!documentBlock || !documentBlock.Confidence) {
      return {
        quality: false,
        error: 'Document structure analysis failed'
      };
    }

    const isHighQuality = documentBlock.Confidence >= config.documentConfidenceThreshold;

    return {
      quality: isHighQuality,
      document: {
        hasDocument: true,
        confidence: documentBlock.Confidence,
        boundingBox: documentBlock.Geometry?.BoundingBox
      },
      error: isHighQuality ? undefined : 'Document quality below threshold'
    };
  } catch (error) {
    console.error('Document Analysis Error:', error);
    return {
      quality: false,
      error: 'Failed to analyze document quality'
    };
  }
}

/**
 * Ensures image is in JPEG format
 */
async function ensureJPEGFormat(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (metadata.format === 'jpeg') {
      return imageBuffer;
    }

    return await image.jpeg().toBuffer();
  } catch (error) {
    throw new Error('Failed to process image format');
  }
}
