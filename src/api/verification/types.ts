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

export type DocumentType = 'id' | 'selfie';

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
  hologramDetection: boolean;
  templateMatching: boolean;
  securityFeatures: boolean;
  manipulationDetection: boolean;
  isAuthentic?: boolean;
  details?: any;
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

export interface WhatsAppMedia {
  id: string;
  url?: string;
}

export interface WhatsAppMessage {
  image?: WhatsAppMedia;
  type?: string;
}

export interface WhatsAppConfig {
  baseUrl: string;
  apiKey: string;
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

export interface ImageQualityConfig {
  minWidth: number;
  minHeight: number;
  blurThreshold: number;
  minBrightness: number;
  maxBrightness: number;
  faceConfidenceThreshold: number;
  documentConfidenceThreshold: number;
}
