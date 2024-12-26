/**
 * Base audit event interface
 */
export interface AuditEvent {
  eventType: string;
  timestamp: string;
  data?: Record<string, any>;
}

/**
 * Specific audit event types
 */
export type AuditEventType =
  | 'FACE_DETECTION'
  | 'FACE_DETECTION_ERROR'
  | 'FACE_POSITION_VALIDATION'
  | 'FACE_POSITION_VALIDATION_ERROR'
  | 'DOCUMENT_DETECTION'
  | 'DOCUMENT_DETECTION_ERROR'
  | 'DOCUMENT_ALIGNMENT_VALIDATION'
  | 'DOCUMENT_ALIGNMENT_VALIDATION_ERROR'
  | 'IMAGE_VALIDATION'
  | 'IMAGE_VALIDATION_ERROR'
  | 'BLUR_DETECTION'
  | 'BLUR_DETECTION_ERROR'
  | 'LIGHTING_ASSESSMENT'
  | 'LIGHTING_ASSESSMENT_ERROR';

/**
 * Audit event with specific type
 */
export interface TypedAuditEvent extends AuditEvent {
  eventType: AuditEventType;
}

/**
 * Image processing audit event data
 */
export interface ImageProcessingData {
  width?: number;
  height?: number;
  processingTime?: number;
  errorMessage?: string;
  [key: string]: any;
}

/**
 * Image validation audit event
 */
export interface ImageValidationAuditEvent extends TypedAuditEvent {
  eventType: 'IMAGE_VALIDATION';
  data: ImageProcessingData & {
    isValid: boolean;
    dimensions?: {
      width: number;
      height: number;
    };
    blurScore?: number;
    brightness?: number;
  };
}

/**
 * Face detection audit event
 */
export interface FaceDetectionAuditEvent extends TypedAuditEvent {
  eventType: 'FACE_DETECTION';
  data: ImageProcessingData & {
    facesFound: number;
    confidence?: number;
    faceLocation?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

/**
 * Document detection audit event
 */
export interface DocumentDetectionAuditEvent extends TypedAuditEvent {
  eventType: 'DOCUMENT_DETECTION';
  data: ImageProcessingData & {
    hasDocument: boolean;
    confidence?: number;
    corners?: Array<{
      x: number;
      y: number;
    }>;
  };
}

/**
 * Error audit event
 */
export interface ErrorAuditEvent extends TypedAuditEvent {
  eventType: Extract<AuditEventType, `${string}_ERROR`>;
  data: {
    errorMessage: string;
    [key: string]: any;
  };
}

/**
 * Union type of all possible audit events
 */
export type SpecificAuditEvent =
  | ImageValidationAuditEvent
  | FaceDetectionAuditEvent
  | DocumentDetectionAuditEvent
  | ErrorAuditEvent;
