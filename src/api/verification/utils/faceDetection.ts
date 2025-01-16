import { 
  RekognitionClient,
  DetectFacesCommand,
  QualityFilter,
  Attribute
} from "@aws-sdk/client-rekognition";
import { FaceDetectionResult, FaceLocation } from '../types';
import { auditLogger } from '../../../utils/auditLogger';
import { FaceDetectionAuditEvent, ErrorAuditEvent } from '../../../types/audit';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const MAX_FACES = 1;
const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Detects a face in the provided image buffer
 * @param imageBuffer - Buffer containing the image data
 * @returns Promise<FaceDetectionResult>
 */
export async function detectFace(imageBuffer: Buffer): Promise<FaceDetectionResult> {
  try {
    const params = {
      Image: {
        Bytes: imageBuffer
      },
      Attributes: [Attribute.ALL],
      QualityFilter: QualityFilter.AUTO
    };

    const command = new DetectFacesCommand(params);
    const response = await rekognition.send(command);

    // Log detection results
    const auditEvent: FaceDetectionAuditEvent = {
      eventType: 'FACE_DETECTION',
      timestamp: new Date().toISOString(),
      data: {
        facesFound: response.FaceDetails?.length || 0
      }
    };
    await auditLogger.log(auditEvent);

    // Validate results
    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      return {
        hasFace: false,
        confidence: 0,
        error: 'No face detected in image'
      };
    }

    if (response.FaceDetails.length > MAX_FACES) {
      return {
        hasFace: false,
        confidence: 0,
        error: 'Multiple faces detected in image'
      };
    }

    // Get the detected face
    const face = response.FaceDetails[0];
    const confidence = face.Confidence || 0;
    const boundingBox = face.BoundingBox;

    // Convert face rect to our format
    const faceLocation: FaceLocation | undefined = boundingBox ? {
      x: boundingBox.Left || 0,
      y: boundingBox.Top || 0,
      width: boundingBox.Width || 0,
      height: boundingBox.Height || 0
    } : undefined;

    return {
      hasFace: confidence >= CONFIDENCE_THRESHOLD,
      confidence,
      faceLocation,
      error: confidence < CONFIDENCE_THRESHOLD ? 'Face detection confidence too low' : undefined
    };
  } catch (err) {
    const error = err as Error;
    const auditEvent: ErrorAuditEvent = {
      eventType: 'FACE_DETECTION_ERROR',
      timestamp: new Date().toISOString(),
      data: {
        errorMessage: error.message
      }
    };
    await auditLogger.log(auditEvent);

    return {
      hasFace: false,
      confidence: 0,
      error: `Face detection failed: ${error.message}`
    };
  }
}

/**
 * Validates if the detected face is properly positioned
 * @param faceLocation - Location of the detected face
 * @returns Promise<boolean>
 */
export async function validateFacePosition(
  faceLocation: FaceLocation
): Promise<boolean> {
  try {
    // Calculate center point of face
    const faceCenterX = faceLocation.x + (faceLocation.width / 2);
    const faceCenterY = faceLocation.y + (faceLocation.height / 2);

    // Define acceptable ranges (center ±20% of image dimensions)
    const ACCEPTABLE_OFFSET = 0.2;
    const acceptableXRange = {
      min: 0.5 - ACCEPTABLE_OFFSET,
      max: 0.5 + ACCEPTABLE_OFFSET
    };
    const acceptableYRange = {
      min: 0.5 - ACCEPTABLE_OFFSET,
      max: 0.5 + ACCEPTABLE_OFFSET
    };

    // Check if face is centered
    const isCentered = 
      faceCenterX >= acceptableXRange.min &&
      faceCenterX <= acceptableXRange.max &&
      faceCenterY >= acceptableYRange.min &&
      faceCenterY <= acceptableYRange.max;

    // Check if face size is appropriate (30-90% of image height)
    const MIN_FACE_HEIGHT_RATIO = 0.3;
    const MAX_FACE_HEIGHT_RATIO = 0.9;
    const faceHeightRatio = faceLocation.height;
    const isSizeAppropriate = 
      faceHeightRatio >= MIN_FACE_HEIGHT_RATIO &&
      faceHeightRatio <= MAX_FACE_HEIGHT_RATIO;

    return isCentered && isSizeAppropriate;
  } catch (err) {
    const error = err as Error;
    const auditEvent: ErrorAuditEvent = {
      eventType: 'FACE_POSITION_VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      data: {
        errorMessage: error.message
      }
    };
    await auditLogger.log(auditEvent);
    return false;
  }
}
