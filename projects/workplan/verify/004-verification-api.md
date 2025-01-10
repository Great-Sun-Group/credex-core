# Task: Verification API Implementation

## Overview
Implement the Express.js API endpoint for photo verification using AWS Rekognition, integrating with existing upload and validation infrastructure.

## Prerequisites
- Completed Task 001 (AWS Base Infrastructure)
- Completed Task 002 (Storage Configuration)
- Completed Task 003 (Photo Upload API)
- AWS Rekognition access configured

## Acceptance Criteria
1. Express endpoint processes verification requests
2. AWS Rekognition collection initialized on startup
3. Face comparison with 90% similarity threshold
4. Reuses existing validation and error handling
5. Integrates with existing audit logging
6. Performance metrics tracked
7. API documentation following existing patterns

## Implementation Steps

### 1. Update Collection Service
```typescript:src/api/verification/services/collectionService.ts
import AWS from 'aws-sdk';
import { auditLogger } from '../utils/auditLogger';
import { config } from '../config';

const rekognition = new AWS.Rekognition();
const COLLECTION_ID = `${config.appName}-faces-${config.environment}`;

export const initializeCollection = async (): Promise<void> => {
  try {
    await createCollection();
    await auditLogger.log({
      eventType: 'COLLECTION_INITIALIZED',
      collectionId: COLLECTION_ID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.code !== 'ResourceAlreadyExistsException') {
      await auditLogger.log({
        eventType: 'COLLECTION_INITIALIZATION_FAILED',
        collectionId: COLLECTION_ID,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
};

export const createCollection = async (): Promise<void> => {
  await rekognition.createCollection({
    CollectionId: COLLECTION_ID
  }).promise();
};

export const deleteCollection = async (): Promise<void> => {
  await rekognition.deleteCollection({
    CollectionId: COLLECTION_ID
  }).promise();
};

// Suggestion 2: Remove deleteCollection from this service if cleanup logic becomes complex, and consider handling it in a dedicated cleanup task or service.
```

### 2. Update Verification Controller
```typescript:src/api/verification/controllers/verificationController.ts
import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import { validateImage } from '../utils/imageValidation'; // Reuse existing validation
import { storeVerificationResult } from '../services/storageService';
import { trackMetrics } from '../services/metricsService';
import { CollectionService } from '../services/collectionService';
import { auditLogger } from '../utils/auditLogger';

const SIMILARITY_THRESHOLD = 90;

export const verifyPhotos = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idPhotoKey, selfiePhotoKey } = req.body;

    // Reuse existing audit logging pattern
    const auditLog = {
      eventType: 'VERIFICATION_REQUEST',
      timestamp: new Date().toISOString(),
      idPhotoKey,
      selfiePhotoKey,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Get images using existing S3 service
    const [idPhoto, selfiePhoto] = await Promise.all([
      getImageFromS3(idPhotoKey),
      getImageFromS3(selfiePhotoKey)
    ]);

    // Reuse existing image validation
    const [idValidation, selfieValidation] = await Promise.all([
      validateImage(idPhoto),
      validateImage(selfiePhoto)
    ]);

    if (!idValidation.isValid || !selfieValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid images provided',
        details: {
          idPhoto: idValidation.error,
          selfiePhoto: selfieValidation.error
        }
      });
    }

    // Compare faces using Rekognition
    const comparisonResult = await rekognition.compareFaces({
      SourceImage: { Bytes: selfiePhoto },
      TargetImage: { Bytes: idPhoto },
      SimilarityThreshold: SIMILARITY_THRESHOLD
    }).promise();

    const result = processComparisonResult(comparisonResult);

    // Update audit log with results
    auditLog.processingResults = {
      similarity: result.similarity,
      verified: result.verified
    };
    await auditLogger.log(auditLog);

    // Store result
    await storeVerificationResult({
      idPhotoKey,
      selfiePhotoKey,
      similarity: result.similarity,
      verified: result.verified,
      timestamp: new Date().toISOString(),
      metadata: {
        idQuality: idValidation.qualityMetrics,
        selfieQuality: selfieValidation.qualityMetrics
      }
    });

    return res.json({
      success: true,
      verified: result.verified,
      similarity: result.similarity,
      message: result.message
    });
  } catch (error) {
    // Use existing error handling pattern
    console.error('Verification error:', error);
    return res.status(500).json({
      error: 'Failed to process verification',
      details: error.message
    });
  }
};

// Suggestion 3: Add caching or rate-limiting for Rekognition requests to enhance performance during high request volumes.
```

### 3. Update Storage Service to Use Existing Patterns
```typescript:src/api/verification/services/storageService.ts
import { DynamoDB } from 'aws-sdk';
import { config } from '../config';
import { VerificationResult } from '../types';

export const storeVerificationResult = async (result: VerificationResult): Promise<void> => {
  const dynamodb = new DynamoDB.DocumentClient();
  
  const params = {
    TableName: config.tables.verifications,
    Item: {
      id: `${result.idPhotoKey}-${result.selfiePhotoKey}`,
      ...result,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days retention
    }
  };
  
  await dynamodb.put(params).promise();
};
```

### 4. Update Application Startup
```typescript:src/app.ts
import { CollectionService } from './api/verification/services/collectionService';
import { auditLogger } from './utils/auditLogger';

export async function startApp() {
  const app = express();
  const collectionService = new CollectionService();

  try {
    await collectionService.initialize();
    await auditLogger.log({
      eventType: 'APP_STARTUP',
      message: 'Rekognition collection initialized successfully'
    });
  } catch (error) {
    await auditLogger.log({
      eventType: 'APP_STARTUP_ERROR',
      error: error.message
    });
    throw error;
  }

  // ... rest of app configuration
}
```

## Testing Requirements
Update tests to use existing patterns and mocks:

```typescript:tests/api/integration/verification/verification.integration.test.ts
import { app } from '../../../../src/app';
import { request } from 'supertest';
import { mockS3, mockRekognition } from '../../../mocks/aws';
import { auditLogger } from '../../../../src/utils/auditLogger';

describe('Verification API Integration', () => {
  beforeEach(() => {
    // Reuse existing mock setup patterns
    mockS3.reset();
    mockRekognition.reset();
    jest.spyOn(auditLogger, 'log').mockResolvedValue(undefined);
  });

  // ... test implementations following existing patterns
});
```

## Documentation Updates
Follow existing documentation patterns:

```markdown:docs/api/verification.md
# Verification API

## POST /v1/verification/verify

Verifies identity by comparing ID photo with selfie using facial recognition.

### Request Body
\```json
{
  "idPhotoKey": "string",
  "selfiePhotoKey": "string"
}
\```

### Response
\```json
{
  "success": true,
  "verified": boolean,
  "similarity": number,
  "message": "string"
}
\```

### Error Responses
Following existing error response patterns...
```

## Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Reuses existing validation utilities
- [ ] Integrates with existing audit logging
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] API documentation follows existing patterns
- [ ] Error handling consistent with existing patterns
- [ ] Security review completed
- [ ] Performance tested
- [ ] Metrics tracking verified
- [ ] Branch up to date with verify-project

## Notes
- Reuses existing image validation from Task 003
- Integrates with existing audit logging system
- Follows established error handling patterns
- Uses existing configuration management
- Maintains consistent API response format

## Estimated Time
5-7 hours (reduced from original estimate due to reuse of existing components)

## Dependencies
- Task 001 (AWS Base Infrastructure)
- Task 002 (Storage Configuration)
- Task 003 (Photo Upload API)

## Next Steps
After this task is completed, proceed with:
1. Image Quality Validation (005-image-quality)
2. ID Document Processing (006-id-processing)

