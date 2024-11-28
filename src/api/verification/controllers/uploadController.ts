import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { validateImage } from '../utils/imageValidation';
import { extractDocumentData } from '../utils/documentProcessing';
import { auditLogger } from '../../../utils/auditLogger';
import crypto from 'crypto';
import { 
  PhotoUploadRequest, 
  ExtractedDocumentData, 
  AuthenticityChecks,
  UploadMetadata,
  AuditLog,
  FileUpload,
  DocumentType,
  ValidationResult
} from '../types';

const s3 = new AWS.S3();
const textract = new AWS.Textract();

const detectHologram = async (image: Buffer): Promise<boolean> => {
  try {
    // Convert image to grayscale for hologram detection
    const { data, info } = await sharp(image)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Analyze pixel patterns for holographic features
    let holoScore = 0;
    const threshold = 0.6; // 60% confidence threshold

    // Check for characteristic hologram patterns
    // This is a simplified implementation - in production, use ML model
    for (let i = 0; i < data.length - 3; i += 3) {
      const pattern = data.slice(i, i + 3);
      if (isHologramPattern(pattern)) {
        holoScore++;
      }
    }

    const normalizedScore = holoScore / (data.length / 3);
    return normalizedScore > threshold;
  } catch (error) {
    console.error('Hologram detection error:', error);
    return false;
  }
};

const matchTemplate = async (image: Buffer, type: string): Promise<boolean> => {
  try {
    // Get template features based on document type
    const templateFeatures = await getTemplateFeatures(type);
    
    // Extract features from uploaded image
    const imageFeatures = await extractImageFeatures(image);
    
    // Compare features
    const matchScore = compareFeatures(templateFeatures, imageFeatures);
    const threshold = 0.8; // 80% match required
    
    return matchScore >= threshold;
  } catch (error) {
    console.error('Template matching error:', error);
    return false;
  }
};

const checkSecurityFeatures = async (image: Buffer): Promise<boolean> => {
  try {
    const securityChecks = await Promise.all([
      checkUVFeatures(image),
      checkMicroprint(image),
      checkWatermark(image)
    ]);
    
    // Require all security features to pass
    return securityChecks.every(check => check);
  } catch (error) {
    console.error('Security features check error:', error);
    return false;
  }
};

const detectManipulation = async (image: Buffer): Promise<boolean> => {
  try {
    // Check for common manipulation indicators
    const checks = await Promise.all([
      checkMetadata(image),
      checkNoisePatterns(image),
      checkEdgeConsistency(image)
    ]);
    
    // Image is considered unmanipulated if all checks pass
    return checks.every(check => check);
  } catch (error) {
    console.error('Manipulation detection error:', error);
    return false;
  }
};

const generateDocumentHash = async (buffer: Buffer): Promise<string> => {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
};

const sanitizeInput = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9-_]/g, '');
};

const maskSensitiveData = (data: ExtractedDocumentData): Partial<ExtractedDocumentData> => {
  const maskedFields: Record<string, any> = {};
  
  // Mask specific fields while preserving structure
  Object.entries(data.fields).forEach(([key, value]) => {
    if (isSensitiveField(key)) {
      maskedFields[key] = maskField(value);
    } else {
      maskedFields[key] = value;
    }
  });
  
  return {
    ...data,
    fields: maskedFields
  };
};

export const uploadPhoto = async (req: Request, res: Response): Promise<Response> => {
  const startTime = Date.now();
  try {
    const type = req.body.type as DocumentType;
    const file = req.file as FileUpload;

    if (!file || !type) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Validate file
    const validationResult = await validateImage(file);
    if (!validationResult.isValid) {
      await auditLogger.logVerificationEvent({
        eventType: 'DOCUMENT_VALIDATION_FAILED',
        documentType: type,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] as string,
        processingResults: {
          qualityChecks: validationResult,
          authenticityChecks: null,
          extractedData: null
        },
        documentHash: await generateDocumentHash(file.buffer),
        requestId: req.id
      });

      return res.status(400).json({
        error: validationResult.error
      });
    }
    
    // Process image with enhanced quality checks
    const processedImage = await sharp(file.buffer)
      .resize(1024, 1024, { fit: 'inside' })
      .toBuffer();
    
    // Enhanced metadata
    const metadata: UploadMetadata = {
      uploadDate: new Date().toISOString(),
      documentType: sanitizeInput(type),
      validationResults: JSON.stringify(validationResult),
      documentHash: await generateDocumentHash(processedImage),
      auditId: uuidv4()
    };
    
    // For ID documents, extract text data using Textract
    let extractedData: ExtractedDocumentData | null = null;
    if (type === 'id') {
      extractedData = await extractDocumentData(processedImage);
      
      // Add extracted data to metadata
      metadata.extractedFields = JSON.stringify(extractedData);
    }
    
    // Add Document Authenticity Checks
    const authenticityChecks: AuthenticityChecks = {
      hologramDetection: await detectHologram(processedImage),
      templateMatching: await matchTemplate(processedImage, type),
      securityFeatures: await checkSecurityFeatures(processedImage),
      manipulationDetection: await detectManipulation(processedImage),
      isAuthentic: false,
      details: {}
    };

    // Set isAuthentic based on all security checks
    authenticityChecks.isAuthentic = (
      authenticityChecks.hologramDetection &&
      authenticityChecks.templateMatching &&
      authenticityChecks.securityFeatures &&
      authenticityChecks.manipulationDetection
    );

    // Only check authenticity for ID documents
    if (type === 'id' && !authenticityChecks.isAuthentic) {
      await auditLogger.logVerificationEvent({
        eventType: 'DOCUMENT_AUTHENTICITY_FAILED',
        documentType: type,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] as string,
        processingResults: {
          qualityChecks: validationResult,
          authenticityChecks,
          extractedData: extractedData ? maskSensitiveData(extractedData) : null
        },
        documentHash: metadata.documentHash,
        requestId: req.id
      });

      return res.status(400).json({
        error: 'Document authenticity check failed',
        details: authenticityChecks.details
      });
    }
    
    try {
      // Upload to S3 with enhanced path structure
      const key = `uploads/${type}s/${uuidv4()}`;
      await s3.putObject({
        Bucket: process.env.PHOTOS_BUCKET!,
        Key: key,
        Body: processedImage,
        ContentType: file.mimetype,
        Metadata: {
          ...Object.entries(metadata).reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value?.toString()
          }), {})
        },
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: process.env.KMS_KEY_ID,
        Tagging: 'DataType=PII'
      }).promise();
      
      // Log successful upload
      await auditLogger.logVerificationEvent({
        eventType: 'DOCUMENT_UPLOAD_SUCCESS',
        documentType: type,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] as string,
        processingResults: {
          qualityChecks: validationResult,
          authenticityChecks,
          extractedData: extractedData ? maskSensitiveData(extractedData) : null
        },
        documentHash: metadata.documentHash,
        requestId: req.id
      });
      
      return res.json({
        success: true,
        key,
        message: 'Photo uploaded successfully',
        validationDetails: validationResult,
        extractedData: type === 'id' ? extractedData : undefined
      });
    } catch (s3Error) {
      await auditLogger.logVerificationEvent({
        eventType: 'DOCUMENT_UPLOAD_FAILED',
        documentType: type,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] as string,
        processingResults: {
          qualityChecks: validationResult,
          authenticityChecks,
          extractedData: null
        },
        documentHash: metadata.documentHash,
        requestId: req.id
      });

      console.error('S3 upload error:', s3Error);
      return res.status(500).json({ 
        error: 'Failed to process upload',
        details: s3Error instanceof Error ? s3Error.message : 'Unknown error'
      });
    }
  } catch (error) {
    await auditLogger.logVerificationEvent({
      eventType: 'DOCUMENT_PROCESSING_ERROR',
      documentType: 'unknown',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] as string,
      processingResults: {
        qualityChecks: null,
        authenticityChecks: null,
        extractedData: null
      },
      documentHash: '',
      requestId: req.id
    });

    console.error('Upload processing error:', error);
    return res.status(500).json({ 
      error: 'Failed to process upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper functions for security features
function isHologramPattern(pattern: Buffer): boolean {
  // Analyze pixel pattern for holographic characteristics
  // This is a simplified check - in production, use more sophisticated analysis
  const [r, g, b] = pattern;
  return Math.abs(r - g) > 50 && Math.abs(g - b) > 50;
}

async function getTemplateFeatures(type: string): Promise<any[]> {
  // In production, load actual template features from a secure database
  return [];
}

async function extractImageFeatures(image: Buffer): Promise<any[]> {
  // Extract key features from the image
  // In production, use computer vision algorithms
  return [];
}

function compareFeatures(template: any[], actual: any[]): number {
  // Compare template features with actual features
  // Return similarity score between 0 and 1
  return 1;
}

async function checkUVFeatures(image: Buffer): Promise<boolean> {
  // Check for UV security features
  // In production, use specialized UV detection algorithms
  return true;
}

async function checkMicroprint(image: Buffer): Promise<boolean> {
  // Check for microprint security features
  // In production, use high-resolution analysis
  return true;
}

async function checkWatermark(image: Buffer): Promise<boolean> {
  // Check for watermark security features
  // In production, use watermark detection algorithms
  return true;
}

async function checkMetadata(image: Buffer): Promise<boolean> {
  // Check image metadata for signs of manipulation
  return true;
}

async function checkNoisePatterns(image: Buffer): Promise<boolean> {
  // Analyze noise patterns for signs of manipulation
  return true;
}

async function checkEdgeConsistency(image: Buffer): Promise<boolean> {
  // Check edge consistency for signs of manipulation
  return true;
}

function isSensitiveField(field: string): boolean {
  const sensitiveFields = [
    'idNumber',
    'passportNumber',
    'driverLicense',
    'dateOfBirth',
    'address'
  ];
  return sensitiveFields.includes(field);
}

function maskField(value: string): string {
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.length <= 4) return '*'.repeat(value.length);
  return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
}
