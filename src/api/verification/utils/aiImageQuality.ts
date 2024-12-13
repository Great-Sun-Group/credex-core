import { 
  RekognitionClient,
  DetectFacesCommand,
  DetectLabelsCommand,
  DetectFacesCommandOutput,
  QualityFilter,
  Label
} from "@aws-sdk/client-rekognition";
import {
  TextractClient,
  AnalyzeDocumentCommand,
  GetDocumentAnalysisCommand,
  DocumentMetadata,
  Block,
  BlockType,
  EntityType,
  Relationship,
  FeatureType
} from "@aws-sdk/client-textract";
import { FaceDetectionResult, DocumentDetectionResult, ImageQualityConfig } from '../types';
import sharp from 'sharp';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const textract = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

interface DocumentTextResult {
  text: string;
  confidence: number;
  fields?: Record<string, string>;
}

interface AnalysisResult {
  quality: boolean;
  face?: FaceDetectionResult;
  document?: DocumentDetectionResult;
  documentText?: DocumentTextResult;
  error?: string;
}

export async function analyzeImageQuality(
  imageBuffer: Buffer,
  config: ImageQualityConfig,
  type: 'id' | 'selfie'
): Promise<AnalysisResult> {
  try {
    // Convert image to proper format if needed
    const processedBuffer = await ensureJPEGFormat(imageBuffer);
    
    if (type === 'selfie') {
      return await analyzeSelfieQuality(processedBuffer, config);
    } else {
      return await analyzeDocumentQuality(processedBuffer, config);
    }
  } catch (error) {
    console.error('AI Image Quality Analysis Error:', error);
    return {
      quality: false,
      error: 'Failed to analyze image quality'
    };
  }
}

async function analyzeSelfieQuality(
  imageBuffer: Buffer,
  config: ImageQualityConfig
): Promise<AnalysisResult> {
  const params = {
    Image: {
      Bytes: imageBuffer
    },
    QualityFilter: QualityFilter.AUTO
  };

  try {
    const response: DetectFacesCommandOutput = await rekognition.send(
      new DetectFacesCommand(params)
    );

    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      return {
        quality: false,
        face: {
          hasFace: false,
          confidence: 0,
          error: 'No face detected'
        }
      };
    }

    const faceDetail = response.FaceDetails[0];
    const quality = faceDetail.Quality;
    const brightness = quality?.Brightness || 0;
    const sharpness = quality?.Sharpness || 0;

    // Check if face quality meets requirements
    const isQualityAcceptable = 
      brightness >= config.minBrightness &&
      brightness <= config.maxBrightness &&
      sharpness >= config.blurThreshold;

    const boundingBox = faceDetail.BoundingBox;
    
    return {
      quality: isQualityAcceptable,
      face: {
        hasFace: true,
        confidence: faceDetail.Confidence || 0,
        faceLocation: boundingBox ? {
          x: boundingBox.Left || 0,
          y: boundingBox.Top || 0,
          width: boundingBox.Width || 0,
          height: boundingBox.Height || 0
        } : undefined
      }
    };
  } catch (error) {
    console.error('Selfie Analysis Error:', error);
    return {
      quality: false,
      error: 'Failed to analyze selfie quality'
    };
  }
}

async function analyzeDocumentQuality(
  imageBuffer: Buffer,
  config: ImageQualityConfig
): Promise<AnalysisResult> {
  try {
    // First use Rekognition to verify it's an ID document
    const rekognitionParams = {
      Image: {
        Bytes: imageBuffer
      },
      MaxLabels: 10
    };

    const rekognitionResponse = await rekognition.send(
      new DetectLabelsCommand(rekognitionParams)
    );

    const isDocument = rekognitionResponse.Labels?.some(
      (label: Label) => 
        label.Name?.toLowerCase().includes('id') ||
        label.Name?.toLowerCase().includes('card') ||
        label.Name?.toLowerCase().includes('document')
    );

    if (!isDocument) {
      return {
        quality: false,
        document: {
          hasDocument: false,
          confidence: 0,
          error: 'No valid document detected'
        }
      };
    }

    // Then use Textract for detailed document analysis
    const textractParams = {
      Document: {
        Bytes: imageBuffer
      },
      FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES]
    };

    const textractResponse = await textract.send(
      new AnalyzeDocumentCommand(textractParams)
    );

    // Extract text and form fields
    const extractedText = textractResponse.Blocks
      ?.filter((block: Block) => block.BlockType === 'LINE')
      .map((block: Block) => block.Text)
      .join(' ');

    // Extract key-value pairs from form fields
    const fields: Record<string, string> = {};
    const keyMap = new Map<string, string>();

    textractResponse.Blocks?.forEach((block: Block) => {
      if (block.BlockType === 'KEY_VALUE_SET') {
        if (block.EntityTypes?.includes('KEY')) {
          const key = block.Relationships?.[0].Ids
            ?.map((id: string) => findBlockById(textractResponse.Blocks || [], id))
            .map((b: Block | undefined) => b?.Text)
            .join(' ');
          if (key && block.Id) {
            keyMap.set(block.Id, key);
          }
        } else if (block.EntityTypes?.includes('VALUE')) {
          const keyId = block.Relationships?.[0].Ids?.[0];
          const key = keyId ? keyMap.get(keyId) : undefined;
          const value = block.Relationships?.[1].Ids
            ?.map((id: string) => findBlockById(textractResponse.Blocks || [], id))
            .map((b: Block | undefined) => b?.Text)
            .join(' ');
          if (key && value) {
            fields[key] = value;
          }
        }
      }
    });

    // Calculate average confidence
    const confidence = textractResponse.Blocks
      ?.filter((block: Block) => block.Confidence !== undefined)
      .reduce((sum: number, block: Block) => sum + (block.Confidence || 0), 0) || 0;
    const avgConfidence = confidence / (textractResponse.Blocks?.length || 1);

    // Get document label confidence from Rekognition
    const documentLabel = rekognitionResponse.Labels?.find(
      (label: Label) => 
        label.Name?.toLowerCase().includes('id') ||
        label.Name?.toLowerCase().includes('card') ||
        label.Name?.toLowerCase().includes('document')
    );

    return {
      quality: avgConfidence >= config.documentConfidenceThreshold,
      document: {
        hasDocument: true,
        confidence: documentLabel?.Confidence || 0
      },
      documentText: {
        text: extractedText || '',
        confidence: avgConfidence,
        fields
      }
    };
  } catch (error) {
    console.error('Document Analysis Error:', error);
    return {
      quality: false,
      error: 'Failed to analyze document quality'
    };
  }
}

function findBlockById(blocks: Block[], id: string): Block | undefined {
  return blocks.find(block => block.Id === id);
}

async function ensureJPEGFormat(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Convert to JPEG if not already
    if (metadata.format !== 'jpeg') {
      return await image
        .jpeg({
          quality: 90,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();
    }
    
    return buffer;
  } catch (error) {
    throw new Error('Failed to process image format');
  }
}
