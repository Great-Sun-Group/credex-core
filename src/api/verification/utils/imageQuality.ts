import { 
  RekognitionClient,
  DetectFacesCommand,
  DetectLabelsCommand,
  DetectFacesCommandOutput,
  QualityFilter,
  Label,
  Attribute
} from "@aws-sdk/client-rekognition";
import {
  TextractClient,
  AnalyzeDocumentCommand,
  Block,
  FeatureType
} from "@aws-sdk/client-textract";
import { 
  BlurResult, 
  LightingResult, 
  ImageValidationResult,
  DocumentType,
  FaceDetectionResult,
  DocumentDetectionResult,
  ExtractedDocumentData
} from '../types';
import sharp from 'sharp';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const textract = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function validateImageQuality(
  imageBuffer: Buffer,
  type: DocumentType,
  config: {
    minWidth: number;
    minHeight: number;
    blurThreshold: number;
    minBrightness: number;
    maxBrightness: number;
    faceConfidenceThreshold: number;
    documentConfidenceThreshold: number;
  }
): Promise<ImageValidationResult> {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Unable to read image dimensions',
        details: {
          errorMessage: 'Invalid image format',
          size: imageBuffer.length,
          type: metadata.format || 'unknown',
          width: 0,
          height: 0
        },
        qualityMetrics: {
          dimensions: { width: 0, height: 0 },
          blur: { isAcceptable: false, value: 0, threshold: config.blurThreshold },
          lighting: {
            isAcceptable: false,
            value: 0,
            range: { minBrightness: config.minBrightness, maxBrightness: config.maxBrightness }
          }
        }
      };
    }

    // Resolution check
    if (metadata.width < config.minWidth || metadata.height < config.minHeight) {
      return {
        isValid: false,
        error: `Image resolution must be at least ${config.minWidth}x${config.minHeight}`,
        details: {
          size: imageBuffer.length,
          type: metadata.format || 'unknown',
          width: metadata.width,
          height: metadata.height,
          errorMessage: `Image resolution too low`
        }
      };
    }

    // Process based on type
    if (type === 'selfie') {
      return await validateSelfie(imageBuffer, metadata, config);
    } else {
      return await validateDocument(imageBuffer, metadata, config);
    }
  } catch (error) {
    console.error('Image Quality Validation Error:', error);
    return {
      isValid: false,
      error: 'Failed to validate image quality',
      details: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        size: imageBuffer.length,
        type: 'unknown',
        width: 0,
        height: 0
      }
    };
  }
}

async function validateSelfie(
  imageBuffer: Buffer,
  metadata: sharp.Metadata,
  config: any
): Promise<ImageValidationResult> {
  try {
    const response = await rekognition.send(new DetectFacesCommand({
      Image: { Bytes: imageBuffer },
      Attributes: [Attribute.DEFAULT]
    }));

    const faceDetails = response.FaceDetails?.[0];
    const hasFace = !!faceDetails;

    if (!hasFace) {
      return {
        isValid: false,
        error: 'No face detected in image',
        details: {
          size: imageBuffer.length,
          type: metadata.format,
          width: metadata.width,
          height: metadata.height,
          face: {
            hasFace: false,
            confidence: 0
          }
        }
      };
    }

    const quality = faceDetails.Quality || { Brightness: 50, Sharpness: 50 };
    const confidence = faceDetails.Confidence || 0;

    const blurResult: BlurResult = {
      isAcceptable: (quality.Sharpness || 0) >= config.blurThreshold,
      value: quality.Sharpness || 0,
      threshold: config.blurThreshold
    };

    const lightingResult: LightingResult = {
      isAcceptable: (quality.Brightness || 0) >= config.minBrightness && 
                    (quality.Brightness || 0) <= config.maxBrightness,
      value: quality.Brightness || 0,
      range: {
        minBrightness: config.minBrightness,
        maxBrightness: config.maxBrightness
      }
    };

    const faceResult: FaceDetectionResult = {
      hasFace: true,
      confidence: confidence,
      faceLocation: faceDetails.BoundingBox ? {
        x: faceDetails.BoundingBox.Left || 0,
        y: faceDetails.BoundingBox.Top || 0,
        width: faceDetails.BoundingBox.Width || 0,
        height: faceDetails.BoundingBox.Height || 0
      } : undefined
    };

    const isValid = confidence >= config.faceConfidenceThreshold &&
                   blurResult.isAcceptable &&
                   lightingResult.isAcceptable;

    let error;
    if (!blurResult.isAcceptable) {
      error = 'Image too blurry';
    } else if (!lightingResult.isAcceptable) {
      error = 'Poor lighting conditions';
    } else if (confidence < config.faceConfidenceThreshold) {
      error = 'Face detection confidence too low';
    }

    return {
      isValid,
      ...(error && { error }),
      details: {
        size: imageBuffer.length,
        type: metadata.format,
        width: metadata.width,
        height: metadata.height,
        blur: blurResult,
        lighting: lightingResult,
        face: faceResult
      },
      qualityMetrics: {
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0
        },
        blur: blurResult,
        lighting: lightingResult,
        face: faceResult
      }
    };
  } catch (error) {
    throw new Error(`Failed to validate selfie: ${error}`);
  }
}

async function validateDocument(
  imageBuffer: Buffer,
  metadata: sharp.Metadata,
  config: any
): Promise<ImageValidationResult> {
  try {
    // Detect document using Rekognition
    const labelResponse = await rekognition.send(new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 10
    }));

    const isDocument = labelResponse.Labels?.some(
      (label: Label) => 
        label.Name?.toLowerCase().includes('id') ||
        label.Name?.toLowerCase().includes('card') ||
        label.Name?.toLowerCase().includes('document')
    );

    if (!isDocument) {
      return {
        isValid: false,
        error: 'No valid document detected',
        details: {
          size: imageBuffer.length,
          type: metadata.format,
          width: metadata.width,
          height: metadata.height,
          document: {
            hasDocument: false,
            confidence: 0,
            error: 'No valid document detected'
          }
        }
      };
    }

    // Analyze document using Textract
    const textractResponse = await textract.send(new AnalyzeDocumentCommand({
      Document: { Bytes: imageBuffer },
      FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES]
    }));

    // Extract text and form fields
    const extractedData: ExtractedDocumentData = {
      fields: {},
      confidence: 0
    };

    let totalConfidence = 0;
    let blockCount = 0;

    textractResponse.Blocks?.forEach((block: Block) => {
      if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
        const key = block.Relationships?.[0].Ids
          ?.map(id => textractResponse.Blocks?.find(b => b.Id === id)?.Text)
          .join(' ');
        const value = block.Relationships?.[1].Ids
          ?.map(id => textractResponse.Blocks?.find(b => b.Id === id)?.Text)
          .join(' ');
        
        if (key && value) {
          extractedData.fields[key] = value;
        }
      }
      if (block.Confidence) {
        totalConfidence += block.Confidence;
        blockCount++;
      }
    });

    extractedData.confidence = blockCount > 0 ? totalConfidence / blockCount : 0;

    const documentResult: DocumentDetectionResult = {
      hasDocument: true,
      confidence: labelResponse.Labels?.[0]?.Confidence || 0
    };

    const blurResult: BlurResult = {
      isAcceptable: extractedData.confidence >= config.documentConfidenceThreshold,
      value: extractedData.confidence,
      threshold: config.documentConfidenceThreshold
    };

    const lightingResult: LightingResult = {
      isAcceptable: true, // Document lighting is assessed through text extraction quality
      value: 50,
      range: {
        minBrightness: config.minBrightness,
        maxBrightness: config.maxBrightness
      }
    };

    const isValid = documentResult.confidence >= config.documentConfidenceThreshold &&
                   extractedData.confidence >= config.documentConfidenceThreshold;

    let error;
    if (!blurResult.isAcceptable) {
      error = 'Image too blurry';
    } else if (documentResult.confidence < config.documentConfidenceThreshold) {
      error = 'Document detection confidence too low';
    }

    return {
      isValid,
      ...(error && { error }),
      details: {
        size: imageBuffer.length,
        type: metadata.format,
        width: metadata.width,
        height: metadata.height,
        document: documentResult,
        blur: blurResult,
        lighting: lightingResult,
        errorMessage: JSON.stringify(extractedData)
      },
      qualityMetrics: {
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0
        },
        blur: blurResult,
        lighting: lightingResult,
        document: documentResult
      }
    };
  } catch (error) {
    throw new Error(`Failed to validate document: ${error}`);
  }
}
