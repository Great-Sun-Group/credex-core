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

const s3 = new AWS.S3();

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
    
    // Process image
    const processedImage = await sharp(file.buffer)
      .resize(1024, 1024, { fit: 'inside' })
      .toBuffer();
    
    // Upload to S3
    const key = `uploads/${type}s/${Date.now()}-${file.originalname}`;
    await s3.putObject({
      Bucket: process.env.PHOTOS_BUCKET,
      Key: key,
      Body: processedImage,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadDate: new Date().toISOString()
      }
    }).promise();
    
    return res.json({
      success: true,
      key,
      message: 'Photo uploaded successfully'
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

export const validateImage = async (file) => {
  try {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'File size exceeds 5MB limit'
      };
    }
    
    // Check file type
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'File must be JPG or PNG'
      };
    }
    
    // Check dimensions
    const metadata = await sharp(file.buffer).metadata();
    if (metadata.width < 640 || metadata.height < 480) {
      return {
        isValid: false,
        error: 'Image resolution must be at least 640x480'
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate image'
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
  test('validates file size', async () => {
    // Test implementation
  });
  
  test('validates image dimensions', async () => {
    // Test implementation
  });
  
  test('handles S3 upload', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```javascript
describe('Upload API Integration', () => {
  test('handles WhatsApp upload successfully', async () => {
    // Test implementation
  });
  
  test('handles validation errors correctly', async () => {
    // Test implementation
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
