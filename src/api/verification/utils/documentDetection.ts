// @ts-ignore - OpenCV types not available
import cv from 'opencv4nodejs';
import { DocumentDetectionResult, Corner } from '../types';
import { auditLogger } from '../../../utils/auditLogger';
import { DocumentDetectionAuditEvent, ErrorAuditEvent } from '../../../types/audit';

const MIN_CONTOUR_AREA = 1000; // Minimum area for document contour
const CONFIDENCE_THRESHOLD = 0.8;
const EPSILON_FACTOR = 0.02; // Factor for polygon approximation

/**
 * Detects document edges in the provided image
 * @param imageBuffer - Buffer containing the image data
 * @returns Promise<DocumentDetectionResult>
 */
export async function detectDocumentEdges(imageBuffer: Buffer): Promise<DocumentDetectionResult> {
  try {
    // Load and preprocess image
    const image = await cv.imdecodeAsync(imageBuffer);
    const processedImage = preprocessImage(image);
    
    // Find contours
    const contours = processedImage.findContours(
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    // Find the largest contour (likely the document)
    const documentContour = findLargestContour(contours);
    
    if (!documentContour) {
      return {
        hasDocument: false,
        confidence: 0,
        error: 'No document boundaries detected'
      };
    }

    // Approximate the contour to a polygon
    const epsilon = EPSILON_FACTOR * documentContour.arcLength(true);
    const approxCurve = documentContour.approxPolyDP(epsilon, true);

    // Validate if we have a quadrilateral
    if (approxCurve.length !== 4) {
      return {
        hasDocument: false,
        confidence: 0,
        error: 'Document shape is not rectangular'
      };
    }

    // Convert corners to our format
    const corners: Corner[] = approxCurve.map((point: { x: number; y: number }) => ({
      x: point.x,
      y: point.y
    }));

    // Calculate confidence based on various factors
    const confidence = calculateConfidence(documentContour, image.size);

    // Log detection results
    const auditEvent: DocumentDetectionAuditEvent = {
      eventType: 'DOCUMENT_DETECTION',
      timestamp: new Date().toISOString(),
      data: {
        hasDocument: confidence >= CONFIDENCE_THRESHOLD,
        confidence,
        corners,
        imageSize: {
          width: image.cols,
          height: image.rows
        }
      }
    };
    await auditLogger.log(auditEvent);

    return {
      hasDocument: confidence >= CONFIDENCE_THRESHOLD,
      corners: corners,
      confidence,
      error: confidence < CONFIDENCE_THRESHOLD ? 'Low confidence in document detection' : undefined
    };
  } catch (err) {
    const error = err as Error;
    const auditEvent: ErrorAuditEvent = {
      eventType: 'DOCUMENT_DETECTION_ERROR',
      timestamp: new Date().toISOString(),
      data: {
        errorMessage: error.message
      }
    };
    await auditLogger.log(auditEvent);

    return {
      hasDocument: false,
      confidence: 0,
      error: `Document detection failed: ${error.message}`
    };
  }
}

/**
 * Validates if the detected document is properly aligned
 * @param corners - Array of corner points
 * @returns Promise<boolean>
 */
export async function validateDocumentAlignment(corners: Corner[]): Promise<boolean> {
  try {
    if (corners.length !== 4) {
      return false;
    }

    // Sort corners into top-left, top-right, bottom-right, bottom-left
    const sortedCorners = sortCorners(corners);
    
    // Calculate angles between edges
    const angles = calculateAngles(sortedCorners);
    
    // Check if angles are approximately 90 degrees (±10 degrees)
    const ANGLE_TOLERANCE = 10;
    const hasRightAngles = angles.every(angle => 
      Math.abs(angle - 90) <= ANGLE_TOLERANCE
    );

    // Check if aspect ratio is reasonable (standard document ratios)
    const aspectRatio = calculateAspectRatio(sortedCorners);
    const isAspectRatioValid = validateAspectRatio(aspectRatio);

    return hasRightAngles && isAspectRatioValid;
  } catch (err) {
    const error = err as Error;
    const auditEvent: ErrorAuditEvent = {
      eventType: 'DOCUMENT_ALIGNMENT_VALIDATION_ERROR',
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
 * Preprocesses image for document detection
 * @param image - OpenCV image
 * @returns processed image
 */
function preprocessImage(image: cv.Mat): cv.Mat {
  // Convert to grayscale
  const gray = image.cvtColor(cv.COLOR_BGR2GRAY);
  
  // Apply Gaussian blur
  const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);
  
  // Apply Canny edge detection
  const edges = blurred.canny(50, 150);
  
  // Apply dilation to connect edges
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  return edges.dilate(kernel);
}

/**
 * Finds the largest contour in the image
 * @param contours - Array of contours
 * @returns largest contour or null
 */
function findLargestContour(contours: cv.Contour[]): cv.Contour | null {
  let maxArea = MIN_CONTOUR_AREA;
  let largestContour = null;

  for (const contour of contours) {
    const area = contour.area;
    if (area > maxArea) {
      maxArea = area;
      largestContour = contour;
    }
  }

  return largestContour;
}

/**
 * Calculates confidence score for document detection
 * @param contour - Detected document contour
 * @param imageSize - Size of the original image
 * @returns number between 0 and 1
 */
function calculateConfidence(contour: cv.Contour, imageSize: cv.Size): number {
  try {
    // Factor 1: Area ratio
    const contourArea = contour.area;
    const imageArea = imageSize.height * imageSize.width;
    const areaRatio = contourArea / imageArea;
    const areaScore = Math.min(areaRatio * 2, 1); // Normalize to 0-1

    // Factor 2: Perimeter regularity
    const perimeter = contour.arcLength(true);
    const expectedPerimeter = Math.sqrt(contourArea) * 4;
    const perimeterScore = 1 - Math.abs(perimeter - expectedPerimeter) / expectedPerimeter;

    // Factor 3: Convexity
    const hull = contour.convexHull();
    const convexityScore = contourArea / hull.area;

    // Combine scores with weights
    const confidence = (
      areaScore * 0.4 +
      perimeterScore * 0.3 +
      convexityScore * 0.3
    );

    return Math.max(0, Math.min(1, confidence));
  } catch (error) {
    console.error('Error calculating confidence:', error);
    return 0;
  }
}

/**
 * Sorts corners in clockwise order starting from top-left
 * @param corners - Array of corner points
 * @returns sorted corners
 */
function sortCorners(corners: Corner[]): Corner[] {
  // Calculate center point
  const center = corners.reduce(
    (acc, corner) => ({ x: acc.x + corner.x, y: acc.y + corner.y }),
    { x: 0, y: 0 }
  );
  center.x /= corners.length;
  center.y /= corners.length;

  // Sort corners based on their angle from center
  return corners.sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
}

/**
 * Calculates angles between consecutive edges
 * @param corners - Array of sorted corner points
 * @returns array of angles in degrees
 */
function calculateAngles(corners: Corner[]): number[] {
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

/**
 * Calculates aspect ratio of detected document
 * @param corners - Array of sorted corner points
 * @returns aspect ratio (width/height)
 */
function calculateAspectRatio(corners: Corner[]): number {
  const width = Math.sqrt(
    Math.pow(corners[1].x - corners[0].x, 2) +
    Math.pow(corners[1].y - corners[0].y, 2)
  );
  const height = Math.sqrt(
    Math.pow(corners[3].x - corners[0].x, 2) +
    Math.pow(corners[3].y - corners[0].y, 2)
  );
  return width / height;
}

/**
 * Validates if aspect ratio is within acceptable range
 * @param ratio - Calculated aspect ratio
 * @returns boolean indicating if ratio is valid
 */
function validateAspectRatio(ratio: number): boolean {
  // Common ID document ratios (with tolerance)
  const VALID_RATIOS = [
    { ratio: 1.586, tolerance: 0.1 },  // ID-1 format (credit card size)
    { ratio: 1.414, tolerance: 0.1 },  // A-series format
    { ratio: 1.5, tolerance: 0.1 }     // Common ID card format
  ];

  return VALID_RATIOS.some(valid =>
    Math.abs(ratio - valid.ratio) <= valid.tolerance
  );
}
