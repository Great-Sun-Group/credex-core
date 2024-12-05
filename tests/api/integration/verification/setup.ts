import express, { Express, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import { FileUpload } from '../../../../src/api/verification/types';
import { applySecurityMiddleware } from '../../../../src/middleware/securityConfig';
import { uploadPhoto } from '../../../../src/api/verification/controllers/uploadController';
import { Readable } from 'stream';

// Configuration constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

export function createTestApp(): Express {
  const app = express();
  
  // Apply necessary middleware
  applySecurityMiddleware(app);
  app.use(bodyParser.json());
  
  // Configure multer middleware
  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1
    },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG and PNG files are allowed'));
      }
    }
  });
  
  // Mount the verification routes
  const router = express.Router();
  
  // Handle file upload and validation
  router.post('/verification/upload', upload.single('photo'), (req: Request, res: Response, next: NextFunction) => {
    console.log('Request body:', req.body);
    console.log('File:', req.file);
    
    // Validate request body
    const { type } = req.body;
    if (!type || !['id', 'selfie'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid document type. Must be either "id" or "selfie"'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }
    
    // Create a proper FileUpload object
    const fileUpload: FileUpload = {
      ...req.file,  // Spread existing Multer.File properties
      stream: Readable.from(req.file.buffer)
    } as FileUpload;
    
    // Attach the properly typed file object
    req.file = fileUpload;
    
    next();
  }, uploadPhoto);
  
  app.use('/v1', router);
  
  // Add error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
        });
      }
      return res.status(400).json({
        error: 'File upload error',
        details: err.message
      });
    }
    
    if (err.message === 'Only JPEG and PNG files are allowed') {
      return res.status(400).json({
        error: err.message
      });
    }
    
    if (err.message === 'S3 Error') {
      return res.status(500).json({
        error: 'Failed to process upload',
        details: err.message
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  });
  
  return app;
}

export function startTestServer() {
  const app = createTestApp();
  const port = 3000;
  
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
      resolve(server);
    });
  });
}
