import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { uploadPhoto } from '../controllers/uploadController';
import { validateRequest } from '../../../middleware/validateRequest';
import { validateImageSchema } from '../imageQualityValidationSchemas';
import { PhotoUploadRequest, DocumentType, MulterError } from '../types';
import { auditLogger } from '../../../utils/auditLogger';

const router = express.Router();

// Configuration constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

// Request validation middleware
const validateUploadRequest = validateRequest(validateImageSchema);

// Audit logging middleware
const auditUploadRequest = async (req: Request, _res: Response, next: NextFunction) => {
  await auditLogger.logVerificationEvent({
    eventType: 'UPLOAD_REQUEST',
    documentType: (req.body.type as DocumentType) || 'unknown',
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
  next();
};

// Error handling middleware
const handleUploadError = (error: unknown, _req: Request, res: Response, _next: NextFunction): Response => {
  if (error instanceof Error && 'code' in error) {
    const multerError = error as MulterError;
    
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
      });
    }
    
    return res.status(400).json({
      error: 'File upload error',
      details: multerError.message
    });
  }

  console.error('Upload route error:', error);
  return res.status(500).json({
    error: 'Internal server error',
    details: error instanceof Error ? error.message : 'Unknown error'
  });
};

// Define routes
router.post(
  '/upload',
  auditUploadRequest,
  upload.single('photo'),
  validateUploadRequest,
  uploadPhoto
);

// Error handler must be last
router.use(handleUploadError);

export default router;
