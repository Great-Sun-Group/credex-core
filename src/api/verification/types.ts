import { Request } from 'express';

export interface BlurResult {
  isAcceptable: boolean;
  value: number;
  threshold: number;
  error?: string;
}

export interface LightingResult {
  isAcceptable: boolean;
  value: number;
  range: {
    minBrightness: number;
    maxBrightness: number;
  };
  error?: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    size?: number;
    type?: string;
    width?: number;
    height?: number;
    blur?: BlurResult;
    lighting?: LightingResult;
    face?: FaceDetectionResult;
    document?: DocumentDetectionResult;
    errorMessage?: string;
  };
  qualityMetrics?: {
    dimensions: {
      width: number;
      height: number;
    };
    blur: BlurResult;
    lighting: LightingResult;
    face?: FaceDetectionResult;
    document?: DocumentDetectionResult;
  };
}

export type ValidationResult = ImageValidationResult;

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  stream: NodeJS.ReadableStream;
}

export type UploadedFile = FileUpload;

export type DocumentType = 'DRIVERS_LICENSE' | 'PASSPORT' | 'NATIONAL_ID' | 'selfie' | 'id';

export interface UploadRequestBody {
  type: DocumentType;
}

declare module 'express' {
  export interface Request {
    file?: FileUpload;
  }
}

export interface PhotoUploadRequest extends Request {
  body: UploadRequestBody;
}

export interface AuthenticityChecks {
  hasHologram: boolean;
  templateMatch: boolean;
  hasUVFeatures: boolean;
  hasMicroprint: boolean;
  hasWatermark: boolean;
  validMetadata: boolean;
  validNoisePatterns: boolean;
  validEdges: boolean;
  isAuthentic: boolean;
}

export interface ExtractedDocumentData {
  fields: Record<string, any>;
  confidence: number;
}

export interface UploadMetadata {
  [key: string]: string | undefined;
  uploadDate: string;
  documentType: string;
  validationResults: string;
  documentHash: string;
  auditId: string;
  extractedFields?: string;
}

export interface AuditLog {
  eventType: string;
  timestamp: string;
  documentType: string;
  ipAddress: string | 'unknown';
  userAgent: string;
  processingResults: {
    qualityChecks: any;
    authenticityChecks: AuthenticityChecks;
    extractedData: any;
  };
  documentHash: string;
}

export interface MulterError extends Error {
  code: string;
  field?: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  similarity: number;
  message: string;
  timestamp: string;
  idPhotoKey: string;
  selfiePhotoKey: string;
  metadata?: {
    idQuality?: any;
    selfieQuality?: any;
  };
}

export interface VerificationRequest {
  idPhotoKey: string;
  selfiePhotoKey: string;
}

export interface FaceComparisonResult {
  similarity: number;
  verified: boolean;
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface CollectionServiceConfig {
  collectionId: string;
  similarityThreshold: number;
  environment: string;
  appName: string;
}

export interface VerificationMetrics {
  processingTime: number;
  similarity: number;
  verified: boolean;
  errorType?: string;
  timestamp: string;
}

export interface FaceLocation {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  hasFace: boolean;
  confidence: number;
  faceLocation?: FaceLocation;
  error?: string;
}

export interface Corner {
  x: number;
  y: number;
}

export interface DocumentDetectionResult {
  hasDocument: boolean;
  corners?: Corner[];
  confidence: number;
  error?: string;
}

export const QUALITY_CHECK_TYPES = {
  RESOLUTION: "RESOLUTION",
  FACE: "FACE",
  DOCUMENT: "DOCUMENT",
  BLUR: "BLUR",
  LIGHTING: "LIGHTING"
} as const;

export type QualityCheckType = keyof typeof QUALITY_CHECK_TYPES;

export interface ImageQualityConfig {
  minWidth: number;
  minHeight: number;
  blurThreshold: number;
  minBrightness: number;
  maxBrightness: number;
  faceConfidenceThreshold: number;
  documentConfidenceThreshold: number;
}

export interface DetailedQualityMetrics {
  blur: {
    value: number;
    threshold: number;
    isAcceptable: boolean;
    details?: string;
  };
  lighting: {
    value: number;
    range: { min: number; max: number };
    isAcceptable: boolean;
    details?: string;
  };
  resolution: {
    width: number;
    height: number;
    isAcceptable: boolean;
    minimumRequired: { width: number; height: number };
  };
  face?: {
    confidence: number;
    position: { x: number; y: number, width: number, height: number };
    quality: {
      brightness: number;
      sharpness: number;
    };
  };
  document?: {
    confidence: number;
    textQuality: number;
    corners?: { x: number; y: number }[];
  };
}

export interface FieldMapping {
  required: string[];
  sensitive: string[];
  mapping: Record<string, string>;
}

export interface SecurityFeatures {
  hologramDetected: boolean;
  edgesValid: boolean;
  confidence: number;
}

export interface AuthenticityResult {
  isAuthentic: boolean;
  securityFeatures: SecurityFeatures;
  verificationDate: string;
}
