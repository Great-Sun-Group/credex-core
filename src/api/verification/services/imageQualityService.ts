import { 
  ImageValidationResult, 
  ImageQualityConfig, 
  BlurResult, 
  LightingResult,
  DocumentType,
  ExtractedDocumentData,
  ImageValidationDetails
} from '../types';
import { analyzeImageQuality } from '../utils/aiImageQuality';

export const createImageQualityService = (config: ImageQualityConfig) => {
  const validateImage = async (
    imageBuffer: Buffer,
    type: DocumentType
  ): Promise<ImageValidationResult> => {
    try {
      const metadata = await getImageMetadata(imageBuffer);
      const aiAnalysis = await analyzeImageQuality(imageBuffer, config, type);

      // Convert AI analysis results to expected format
      const blurResult: BlurResult = {
        isAcceptable: type === 'selfie' 
          ? (aiAnalysis.face?.confidence || 0) > config.blurThreshold
          : (aiAnalysis.document?.confidence || 0) > config.blurThreshold,
        value: type === 'selfie'
          ? aiAnalysis.face?.confidence || 0
          : aiAnalysis.document?.confidence || 0,
        threshold: config.blurThreshold
      };

      const lightingResult: LightingResult = {
        isAcceptable: aiAnalysis.quality,
        value: type === 'selfie'
          ? aiAnalysis.face?.confidence || 0
          : aiAnalysis.document?.confidence || 0,
        range: {
          minBrightness: config.minBrightness,
          maxBrightness: config.maxBrightness
        }
      };

      const result: ImageValidationResult = {
        isValid: aiAnalysis.quality,
        details: {
          size: metadata.size,
          type: metadata.format || 'unknown',
          width: metadata.width || 0,
          height: metadata.height || 0,
          blur: blurResult,
          lighting: lightingResult,
          face: type === 'selfie' ? aiAnalysis.face : undefined,
          document: type === 'id' ? aiAnalysis.document : undefined,
          errorMessage: undefined
        },
        qualityMetrics: {
          dimensions: {
            width: metadata.width || 0,
            height: metadata.height || 0
          },
          blur: blurResult,
          lighting: lightingResult,
          face: type === 'selfie' ? aiAnalysis.face : undefined,
          document: type === 'id' ? aiAnalysis.document : undefined
        }
      };

      // If extracted document text is present, add it to errorMessage for logging
      if (type === 'id' && aiAnalysis.documentText?.fields) {
        const extractedData: ExtractedDocumentData = {
          fields: aiAnalysis.documentText.fields,
          confidence: aiAnalysis.documentText.confidence
        };
        
        result.details.errorMessage = JSON.stringify({
          extractedData,
          textConfidence: aiAnalysis.documentText.confidence
        });
      }

      if (!result.isValid) {
        result.error = generateErrorMessage(aiAnalysis, type, config);
      }

      return result;
    } catch (error) {
      console.error('Image Quality Service Error:', error);
      return {
        isValid: false,
        error: 'Failed to validate image quality',
        details: {
          size: 0,
          type: 'unknown',
          width: 0,
          height: 0,
          blur: {
            isAcceptable: false,
            value: 0,
            threshold: config.blurThreshold
          },
          lighting: {
            isAcceptable: false,
            value: 0,
            range: {
              minBrightness: config.minBrightness,
              maxBrightness: config.maxBrightness
            }
          },
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  };

  const getImageMetadata = async (imageBuffer: Buffer) => {
    const sharp = require('sharp');
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    return {
      size: imageBuffer.length,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height
    };
  };

  const generateErrorMessage = (
    analysis: Awaited<ReturnType<typeof analyzeImageQuality>>,
    type: DocumentType,
    config: ImageQualityConfig
  ): string => {
    if (analysis.error) {
      return analysis.error;
    }

    const errors: string[] = [];

    if (type === 'selfie' && !analysis.face?.hasFace) {
      errors.push('No face detected in the image');
    }

    if (type === 'id' && !analysis.document?.hasDocument) {
      errors.push('No valid document detected in the image');
    }

    if (!analysis.quality) {
      if (type === 'selfie') {
        const faceConfidence = analysis.face?.confidence || 0;
        if (faceConfidence < config.faceConfidenceThreshold) {
          errors.push('Face detection confidence too low');
        }
      } else {
        const docConfidence = analysis.document?.confidence || 0;
        if (docConfidence < config.documentConfidenceThreshold) {
          errors.push('Document detection confidence too low');
        }
      }

      if (analysis.documentText && type === 'id') {
        if (analysis.documentText.confidence < config.documentConfidenceThreshold) {
          errors.push('Text extraction quality too low');
        }
      }
    }

    return errors.length > 0 
      ? errors.join('. ') 
      : 'Image quality does not meet requirements';
  };

  return {
    validateImage
  };
};
