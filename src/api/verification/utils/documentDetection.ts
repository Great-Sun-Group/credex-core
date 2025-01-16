import { 
  RekognitionClient,
  DetectLabelsCommand,
  Label
} from "@aws-sdk/client-rekognition";
import {
  TextractClient,
  AnalyzeDocumentCommand,
  FeatureType,
  Block
} from "@aws-sdk/client-textract";
import { DocumentDetectionResult, Corner } from '../types';
import { auditLogger } from '../../../utils/auditLogger';
import { DocumentDetectionAuditEvent, ErrorAuditEvent, TypedAuditEvent } from '../../../types/audit';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const textract = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Detects document edges in the provided image
 * @param imageBuffer - Buffer containing the image data
 * @returns Promise<DocumentDetectionResult>
 */
export async function detectDocumentEdges(imageBuffer: Buffer): Promise<DocumentDetectionResult> {
  try {
    // First use Rekognition to verify it's a document
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
      (label: Label) => 
        label.Name?.toLowerCase().includes('id') ||
        label.Name?.toLowerCase().includes('card') ||
        label.Name?.toLowerCase().includes('document')
    );

    if (!documentLabel) {
      const result = {
        hasDocument: false,
        confidence: 0,
        error: 'No document detected'
      };

      const auditEvent: DocumentDetectionAuditEvent = {
        eventType: 'DOCUMENT_DETECTION',
        timestamp: new Date().toISOString(),
        data: {
          hasDocument: false,
          confidence: 0
        }
      };
      await auditLogger.log(auditEvent);

      return result;
    }

    // Then use Textract to analyze document structure
    const textractParams = {
      Document: {
        Bytes: imageBuffer
      },
      FeatureTypes: [FeatureType.FORMS]
    };

    const textractResponse = await textract.send(
      new AnalyzeDocumentCommand(textractParams)
    );

    // Get document boundaries from Textract
    const documentBoundary = textractResponse.Blocks?.find(
      (block: Block) => block.BlockType === 'PAGE'
    );

    if (!documentBoundary || !documentBoundary.Geometry?.BoundingBox) {
      const result = {
        hasDocument: false,
        confidence: 0,
        error: 'No document boundaries detected'
      };

      const auditEvent: DocumentDetectionAuditEvent = {
        eventType: 'DOCUMENT_DETECTION',
        timestamp: new Date().toISOString(),
        data: {
          hasDocument: false,
          confidence: 0
        }
      };
      await auditLogger.log(auditEvent);

      return result;
    }

    const box = documentBoundary.Geometry.BoundingBox;
    const corners: Corner[] = [
      { x: box.Left || 0, y: box.Top || 0 },  // Top-left
      { x: (box.Left || 0) + (box.Width || 0), y: box.Top || 0 },  // Top-right
      { x: (box.Left || 0) + (box.Width || 0), y: (box.Top || 0) + (box.Height || 0) },  // Bottom-right
      { x: box.Left || 0, y: (box.Top || 0) + (box.Height || 0) }  // Bottom-left
    ];

    // Calculate confidence as average of Rekognition and Textract confidences
    const rekognitionConfidence = documentLabel.Confidence || 0;
    const textractConfidence = documentBoundary.Confidence || 0;
    const confidence = (rekognitionConfidence + textractConfidence) / 2 / 100;

    const result = {
      hasDocument: confidence >= CONFIDENCE_THRESHOLD,
      corners,
      confidence,
      error: confidence < CONFIDENCE_THRESHOLD ? 'Low confidence in document detection' : undefined
    };

    // Log detection results
    const auditEvent: DocumentDetectionAuditEvent = {
      eventType: 'DOCUMENT_DETECTION',
      timestamp: new Date().toISOString(),
      data: {
        hasDocument: result.hasDocument,
        confidence,
        corners
      }
    };
    await auditLogger.log(auditEvent);

    return result;
  } catch (err) {
    const error = err as Error;
    const result = {
      hasDocument: false,
      confidence: 0,
      error: `Document detection failed: ${error.message}`
    };

    const auditEvent: ErrorAuditEvent = {
      eventType: 'DOCUMENT_DETECTION_ERROR',
      timestamp: new Date().toISOString(),
      data: {
        errorMessage: error.message
      }
    };
    await auditLogger.log(auditEvent);

    return result;
  }
}

/**
 * Validates if the detected document is properly aligned
 * @param corners - Array of corner points
 * @returns boolean
 */
export function validateDocumentAlignment(corners: Corner[]): boolean {
  if (!corners || corners.length !== 4) {
    const auditEvent: TypedAuditEvent = {
      eventType: 'DOCUMENT_ALIGNMENT_VALIDATION',
      timestamp: new Date().toISOString(),
      data: {
        isValid: false,
        error: 'Invalid corners array'
      }
    };
    auditLogger.log(auditEvent).catch(console.error);
    return false;
  }

  try {
    // Calculate aspect ratio
    const width = Math.sqrt(
      Math.pow(corners[1].x - corners[0].x, 2) +
      Math.pow(corners[1].y - corners[0].y, 2)
    );
    const height = Math.sqrt(
      Math.pow(corners[3].x - corners[0].x, 2) +
      Math.pow(corners[3].y - corners[0].y, 2)
    );
    const aspectRatio = width / height;

    // Common ID document ratios (with tolerance)
    const VALID_RATIOS = [
      { ratio: 1.586, tolerance: 0.1 },  // ID-1 format (credit card size)
      { ratio: 1.414, tolerance: 0.1 },  // A-series format
      { ratio: 1.5, tolerance: 0.1 }     // Common ID card format
    ];

    // Check if aspect ratio matches any standard format
    const isValidRatio = VALID_RATIOS.some(valid =>
      Math.abs(aspectRatio - valid.ratio) <= valid.tolerance
    );

    // Check if document is skewed (using corner angles)
    const SKEW_TOLERANCE = 10; // degrees
    const angles = calculateCornerAngles(corners);
    const isNotSkewed = angles.every(angle => 
      Math.abs(angle - 90) <= SKEW_TOLERANCE
    );

    const result = isValidRatio && isNotSkewed;

    // Log validation result
    const auditEvent: TypedAuditEvent = {
      eventType: 'DOCUMENT_ALIGNMENT_VALIDATION',
      timestamp: new Date().toISOString(),
      data: {
        isValid: result,
        aspectRatio,
        angles
      }
    };
    auditLogger.log(auditEvent).catch(console.error);

    return result;
  } catch (err) {
    const error = err as Error;
    
    // Log error but don't wait for it
    const auditEvent: ErrorAuditEvent = {
      eventType: 'DOCUMENT_ALIGNMENT_VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      data: {
        errorMessage: error.message
      }
    };
    auditLogger.log(auditEvent).catch(console.error);

    return false;
  }
}

/**
 * Calculates angles at each corner
 * @param corners - Array of corner points
 * @returns array of angles in degrees
 */
function calculateCornerAngles(corners: Corner[]): number[] {
  const angles: number[] = [];
  
  for (let i = 0; i < corners.length; i++) {
    const current = corners[i];
    const next = corners[(i + 1) % corners.length];
    const prev = corners[(i - 1 + corners.length) % corners.length];

    const vector1 = {
      x: prev.x - current.x,
      y: prev.y - current.y
    };
    const vector2 = {
      x: next.x - current.x,
      y: next.y - current.y
    };

    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);

    angles.push(angle);
  }

  return angles;
}
