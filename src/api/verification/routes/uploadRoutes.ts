import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { uploadPhoto } from '../controllers/uploadController';
import { PhotoUploadRequest, DocumentType, MulterError } from '../types';

const router = express.Router();

// Configuration constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  }
});

// Middleware to validate request body
const validateRequestBody = (req: Request, res: Response, next: NextFunction): Response | void => {
  const { type } = req.body;
  
  if (!type || !['id', 'selfie'].includes(type)) {
    return res.status(400).json({
      error: 'Invalid document type. Must be either "id" or "selfie"'
    });
  }

  const uploadRequest = req as PhotoUploadRequest;
  if (!uploadRequest.file) {
    return res.status(400).json({
      error: 'No file uploaded'
    });
  }

  next();
};

// Define routes
router.post(
  '/upload',
  upload.single('photo'),
  validateRequestBody,
  uploadPhoto
);

// Error handling middleware
router.use((error: unknown, _req: Request, res: Response, _next: NextFunction): Response => {
  // Handle Multer errors
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

  // Handle other errors
  console.error('Upload route error:', error);
  return res.status(500).json({
    error: 'Internal server error',
    details: error instanceof Error ? error.message : 'Unknown error'
  });
});

export default router;
