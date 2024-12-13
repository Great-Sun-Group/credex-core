// @ts-ignore - OpenCV types not available
import cv from 'opencv4nodejs';
import { FaceDetectionResult, FaceLocation } from '../types';
import { auditLogger } from '../../../utils/auditLogger';
import { FaceDetectionAuditEvent, ErrorAuditEvent } from '../../../types/audit';

const FACE_CASCADE_PATH = './cascades/haarcascade_frontalface_default.xml';
const MIN_FACE_SIZE = { width: 100, height: 100 };
const MAX_FACES = 1;
const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Detects a face in the provided image buffer
 * @param imageBuffer - Buffer containing the image data
 * @returns Promise<FaceDetectionResult>
 */
export async function detectFace(imageBuffer: Buffer): Promise<FaceDetectionResult> {
  try {
    // Load the image
    const image = await cv.imdecodeAsync(imageBuffer);
    
    // Convert to grayscale for better detection
    const grayImage = image.cvtColor(cv.COLOR_BGR2GRAY);
    
    // Load face cascade classifier
    const classifier = new cv.CascadeClassifier(FACE_CASCADE_PATH);
    
    // Detect faces
    const faces = await classifier.detectMultiScaleAsync(grayImage, {
      scaleFactor: 1.1,
      minNeighbors: 5,
      minSize: MIN_FACE_SIZE
    });

    // Log detection results
    const auditEvent: FaceDetectionAuditEvent = {
      eventType: 'FACE_DETECTION',
      timestamp: new Date().toISOString(),
      data: {
        facesFound: faces.length,
        imageSize: {
          width: image.cols,
          height: image.rows
        }
      }
    };
    await auditLogger.log(auditEvent);

    // Validate results
    if (faces.length === 0) {
      return {
        hasFace: false,
        confidence: 0,
        error: 'No face detected in image'
      };
    }

    if (faces.length > MAX_FACES) {
      return {
        hasFace: false,
        confidence: 0,
        error: 'Multiple faces detected in image'
      };
    }

    // Get the detected face
    const face = faces[0];
    const confidence = calculateConfidence(face, grayImage);

    // Convert face rect to our format
    const faceLocation: FaceLocation = {
      x: face.x,
      y: face.y,
      width: face.width,
      height: face.height
    };

    return {
      hasFace: confidence >= CONFIDENCE_THRESHOLD,
      confidence,
      faceLocation: faceLocation,
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

/**
 * Calculates confidence score for face detection
 * @param face - Detected face rectangle
 * @param grayImage - Grayscale image
 * @returns number between 0 and 1
 */
function calculateConfidence(face: { x: number; y: number; width: number; height: number }, grayImage: cv.Mat): number {
  try {
    // Extract face region
    const faceRegion = grayImage.getRegion(new cv.Rect(face.x, face.y, face.width, face.height));
    
    // Calculate histogram of face region
    const histogram = cv.calcHist(faceRegion, [0], null, [256], [0, 256]);
    
    // Normalize histogram
    const normalizedHist = histogram.convertTo(cv.CV_32F);
    cv.normalize(normalizedHist, normalizedHist, 0, 1, cv.NORM_MINMAX);
    
    // Calculate entropy as a measure of confidence
    let entropy = 0;
    for (let i = 0; i < normalizedHist.rows; i++) {
      const p = normalizedHist.at(i, 0);
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    
    // Convert entropy to confidence score (0-1 range)
    const maxEntropy = Math.log2(256); // Maximum possible entropy
    const confidence = 1 - (entropy / maxEntropy);
    
    return confidence;
  } catch (error) {
    console.error('Error calculating confidence:', error);
    return 0;
  }
}
