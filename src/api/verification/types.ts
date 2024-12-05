import { Request } from 'express';
import { BlurResult, LightingResult } from './utils/imageQuality';

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
    errorMessage?: string; // Add error message field
  };
  qualityMetrics?: {
    dimensions: {
      width: number;
      height: number;
    };
    blur: BlurResult;
    lighting: LightingResult;
  };
}

// Alias ValidationResult to ImageValidationResult for backward compatibility
export type ValidationResult = ImageValidationResult;

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer: Buffer;
  stream: NodeJS.ReadableStream;
}

// Use FileUpload as the consistent type
export type UploadedFile = FileUpload;

export type DocumentType = 'id' | 'selfie';

export interface UploadRequestBody {
  type: DocumentType;
}

// Extend Express's Request type
declare global {
  namespace Express {
    interface Request {
      file?: FileUpload;
    }
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
  [key: string]: string | undefined; // Add index signature for AWS S3 Metadata compatibility
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
  ipAddress: string | 'unknown'; // Allow 'unknown' as fallback
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

// WhatsApp related types
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
