# Task: Photo Upload API Implementation

## Overview
Implement the Express.js API endpoint for handling photo uploads from WhatsApp, including file validation and S3 storage integration.

## Prerequisites
- Completed Task 001 (AWS Base Infrastructure)
- Completed Task 002 (Storage Configuration)
- Node.js/Express.js environment
- WhatsApp Business API access

## Acceptance Criteria
1. Express endpoint receives photos from WhatsApp
2. File validation checks implemented:
   - Format (JPG/PNG)
   - Size (≤ 5MB)
   - Resolution (≥ 640x480)
3. Successful S3 upload with proper path structure
4. Error handling for all failure cases
5. Response includes upload confirmation
6. API documentation complete

## Implementation Steps

### 1. Create Upload Controller
```javascript
// src/api/verification/controllers/uploadController.js
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { validateImage } from '../utils/imageValidation';
import { extractDocumentData } from '../utils/documentProcessing';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3();
const textract = new AWS.Textract();

export const uploadPhoto = async (req, res) => {
  try {
    const { type, file } = req.body; // type: 'id' or 'selfie'
    
    // Validate file
    const validationResult = await validateImage(file);
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: validationResult.error
      });
    }
    
    // Process image with enhanced quality checks
    const processedImage = await sharp(file.buffer)
      .resize(1024, 1024, { fit: 'inside' })
      .toBuffer();
    
    // Enhanced metadata
    const metadata = {
      uploadDate: new Date().toISOString(),
      documentType: sanitizeInput(type),
      validationResults: JSON.stringify(validationResult),
      documentHash: await generateDocumentHash(processedImage),
      auditId: uuidv4()
    };
    
    // For ID documents, extract text data using Textract
    let extractedData = null;
    if (type === 'id') {
      extractedData = await extractDocumentData(processedImage);
      
      // Add extracted data to metadata
      metadata.extractedFields = JSON.stringify(extractedData);
    }
    
    // Add Document Authenticity Checks
    const authenticityChecks = {
      hologramDetection: await detectHologram(processedImage),
      templateMatching: await matchTemplate(processedImage, type),
      securityFeatures: await checkSecurityFeatures(processedImage),
      manipulationDetection: await detectManipulation(processedImage)
    };

    if (!authenticityChecks.isAuthentic) {
      return {
        isValid: false,
        error: 'Document authenticity check failed',
        details: authenticityChecks.details
      };
    }
    
    // Upload to S3 with enhanced path structure
    const key = `uploads/${type}s/${uuidv4()}`;
    await s3.putObject({
      Bucket: process.env.PHOTOS_BUCKET,
      Key: key,
      Body: processedImage,
      ContentType: file.mimetype,
      Metadata: metadata,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.KMS_KEY_ID,
      Tagging: 'DataType=PII'
    }).promise();
    
    // Add Comprehensive Audit Logging
    const auditLog = {
      eventType: 'DOCUMENT_UPLOAD',
      timestamp: new Date().toISOString(),
      documentType: type,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      processingResults: {
        qualityChecks,
        authenticityChecks,
        extractedData: extractedData ? maskSensitiveData(extractedData) : null
      },
      documentHash: metadata.documentHash
    };

    await auditLogger.log(auditLog);
    
    return res.json({
      success: true,
      key,
      message: 'Photo uploaded successfully',
      validationDetails: validationResult,
      extractedData: type === 'id' ? extractedData : undefined
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to process upload'
    });
  }
};
```

### 2. Create Validation Utility
```javascript
// src/api/verification/utils/imageValidation.js
import sharp from 'sharp';
import { detectBlur, assessLighting } from './imageQuality';

export const validateImage = async (file) => {
  try {
    // Basic validation
    if (file.size > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'File size exceeds 5MB limit',
        details: { size: file.size }
      };
    }
    
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'File must be JPG or PNG',
        details: { type: file.mimetype }
      };
    }
    
    // Enhanced image analysis
    const metadata = await sharp(file.buffer).metadata();
    const qualityChecks = {
      dimensions: metadata.width >= 640 && metadata.height >= 480,
      blur: await detectBlur(file.buffer),
      lighting: await assessLighting(file.buffer)
    };
    
    if (!qualityChecks.dimensions) {
      return {
        isValid: false,
        error: 'Image resolution must be at least 640x480',
        details: { width: metadata.width, height: metadata.height }
      };
    }
    
    if (!qualityChecks.blur.isAcceptable) {
      return {
        isValid: false,
        error: 'Image is too blurry',
        details: qualityChecks.blur
      };
    }
    
    if (!qualityChecks.lighting.isAcceptable) {
      return {
        isValid: false,
        error: 'Image lighting is inadequate',
        details: qualityChecks.lighting
      };
    }
    
    return { 
      isValid: true,
      qualityMetrics: {
        ...qualityChecks,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        }
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate image',
      details: error.message
    };
  }
};
```

### 3. Create Route Configuration
```javascript
// src/api/verification/routes/uploadRoutes.js
import express from 'express';
import multer from 'multer';
import { uploadPhoto } from '../controllers/uploadController';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post('/upload', upload.single('photo'), uploadPhoto);

export default router;
```

### 4. WhatsApp Integration
```javascript
// src/api/verification/services/whatsappService.js
import { WhatsAppClient } from '../utils/whatsappClient';

export const handleWhatsAppMedia = async (message) => {
  try {
    const mediaId = message.image.id;
    const mediaUrl = await WhatsAppClient.getMediaUrl(mediaId);
    const mediaBuffer = await WhatsAppClient.downloadMedia(mediaUrl);
    
    // Process upload
    const uploadResult = await uploadToVerificationAPI(mediaBuffer, {
      type: determinePhotoType(message),
      originalname: `${mediaId}.jpg`,
      mimetype: 'image/jpeg',
      size: mediaBuffer.length
    });
    
    return uploadResult;
  } catch (error) {
    console.error('WhatsApp media handling error:', error);
    throw error;
  }
};
```

## Testing Requirements
1. Unit Tests
```javascript
describe('Photo Upload', () => {
  // Mock dependencies
  const mockS3 = {
    putObject: jest.fn().mockReturnValue({ promise: () => Promise.resolve() })
  };
  const mockSharp = jest.fn();
  
  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
  });

  test('validates file size and type', async () => {
    const validFile = {
      size: 1024 * 1024, // 1MB
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test')
    };
    
    const result = await validateImage(validFile);
    expect(result.isValid).toBe(true);
    
    const largeFile = { ...validFile, size: 6 * 1024 * 1024 }; // 6MB
    const sizeResult = await validateImage(largeFile);
    expect(sizeResult.isValid).toBe(false);
    expect(sizeResult.error).toContain('size exceeds');
    
    const invalidType = { ...validFile, mimetype: 'image/gif' };
    const typeResult = await validateImage(invalidType);
    expect(typeResult.isValid).toBe(false);
    expect(typeResult.error).toContain('must be JPG or PNG');
  });
  
  test('validates image dimensions', async () => {
    const mockMetadata = {
      width: 640,
      height: 480
    };
    mockSharp.mockReturnValue({ metadata: () => mockMetadata });
    
    // Test implementation for dimension validation
  });
  
  // ... other test implementations
});
```

2. Integration Tests
```javascript
describe('Upload API Integration', () => {
  let app;
  
  beforeAll(() => {
    app = express();
    app.use('/api', uploadRoutes);
  });

  test('handles WhatsApp upload successfully', async () => {
    const mockFile = {
      buffer: Buffer.from('test-image'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024 * 1024
    };

    const response = await request(app)
      .post('/api/upload')
      .attach('photo', mockFile.buffer, {
        filename: mockFile.originalname,
        contentType: mockFile.mimetype
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('key');
  });
  
  test('handles validation errors correctly', async () => {
    const invalidFile = {
      buffer: Buffer.from('test-image'),
      originalname: 'test.txt',
      mimetype: 'text/plain',
      size: 1024
    };

    const response = await request(app)
      .post('/api/upload')
      .attach('photo', invalidFile.buffer, {
        filename: invalidFile.originalname,
        contentType: invalidFile.mimetype
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
```

## Documentation Requirements
1. API Documentation
   - Endpoint specifications
   - Request/response formats
   - Error codes and messages
   - Example requests

2. Integration Guide
   - WhatsApp setup instructions
   - Environment variables
   - Testing procedures

## Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] API documentation complete
- [ ] Error handling tested
- [ ] Security review completed
- [ ] WhatsApp integration tested
- [ ] Performance tested with large files
- [ ] Branch up to date with verify-project

## Notes
- Ensure proper error handling for WhatsApp API failures
- Consider implementing retry logic for failed uploads
- Monitor upload performance and adjust as needed
- Document rate limiting considerations

## Estimated Time
5-7 hours

## Dependencies
- Task 001 (AWS Base Infrastructure)
- Task 002 (Storage Configuration)

## Next Steps
After this task is completed, proceed with:
1. Verification API (004-verification-api)
2. Image Quality Validation (005-image-quality)
