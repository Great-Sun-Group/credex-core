# Task: Verification API Implementation

## Overview
Implement the Express.js API endpoint for photo verification using AWS Rekognition, including collection initialization, face comparison, and result handling.

## Prerequisites
- Completed Task 001 (AWS Base Infrastructure)
- Completed Task 002 (Storage Configuration)
- Completed Task 003 (Photo Upload API)
- AWS Rekognition access configured

## Acceptance Criteria
1. Express endpoint processes verification requests
2. AWS Rekognition collection initialized on startup
3. Face comparison with 90% similarity threshold
4. Comprehensive error handling
5. Verification results stored
6. Performance metrics tracked
7. API documentation complete

## Implementation Steps

### 1. Create Collection Service
```javascript
// src/api/verification/services/collectionService.js
import AWS from 'aws-sdk';
import { logger } from '../utils/logger';

export class CollectionService {
  constructor() {
    this.rekognition = new AWS.Rekognition();
    this.collectionId = `credex-member-faces-${process.env.ENVIRONMENT}`;
  }

  async initialize() {
    try {
      await this.createCollection();
      logger.info(`Rekognition collection ${this.collectionId} initialized`);
    } catch (error) {
      if (error.code !== 'ResourceAlreadyExistsException') {
        logger.error('Failed to initialize Rekognition collection:', error);
        throw error;
      }
      logger.info(`Rekognition collection ${this.collectionId} already exists`);
    }
  }

  async createCollection() {
    const params = {
      CollectionId: this.collectionId
    };
    
    await this.rekognition.createCollection(params).promise();
  }

  async ensureCollection() {
    try {
      await this.rekognition.describeCollection({
        CollectionId: this.collectionId
      }).promise();
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        await this.initialize();
      } else {
        throw error;
      }
    }
  }

  async deleteCollection() {
    const params = {
      CollectionId: this.collectionId
    };
    
    await this.rekognition.deleteCollection(params).promise();
  }
}
```

### 2. Create Verification Controller
```javascript
// src/api/verification/controllers/verificationController.js
import AWS from 'aws-sdk';
import { storeVerificationResult } from '../services/storageService';
import { trackMetrics } from '../services/metricsService';
import { CollectionService } from '../services/collectionService';

const rekognition = new AWS.Rekognition();
const collectionService = new CollectionService();
const SIMILARITY_THRESHOLD = 90;

export const verifyPhotos = async (req, res) => {
  try {
    // Ensure collection exists
    await collectionService.ensureCollection();

    const { idPhotoKey, selfiePhotoKey } = req.body;
    
    // Get images from S3
    const idPhoto = await getImageFromS3(idPhotoKey);
    const selfiePhoto = await getImageFromS3(selfiePhotoKey);
    
    // Compare faces
    const comparisonResult = await rekognition.compareFaces({
      SourceImage: {
        Bytes: selfiePhoto
      },
      TargetImage: {
        Bytes: idPhoto
      },
      SimilarityThreshold: SIMILARITY_THRESHOLD,
      CollectionId: collectionService.collectionId
    }).promise();
    
    // Process results
    const result = processComparisonResult(comparisonResult);
    
    // Store result
    await storeVerificationResult({
      idPhotoKey,
      selfiePhotoKey,
      similarity: result.similarity,
      verified: result.verified,
      timestamp: new Date().toISOString()
    });
    
    // Track metrics
    await trackMetrics({
      type: 'verification',
      success: result.verified,
      similarity: result.similarity
    });
    
    return res.json({
      success: true,
      verified: result.verified,
      similarity: result.similarity,
      message: result.message
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      error: 'Failed to process verification'
    });
  }
};
```

### 3. Create Processing Service
```javascript
// src/api/verification/services/processingService.js
export const processComparisonResult = (result) => {
  if (!result.FaceMatches || result.FaceMatches.length === 0) {
    return {
      verified: false,
      similarity: 0,
      message: 'No matching faces found'
    };
  }
  
  const match = result.FaceMatches[0];
  const similarity = Math.round(match.Similarity * 100) / 100;
  
  return {
    verified: similarity >= SIMILARITY_THRESHOLD,
    similarity,
    message: similarity >= SIMILARITY_THRESHOLD
      ? 'Identity verified successfully'
      : 'Identity verification failed'
  };
};
```

### 4. Create Storage Service
```javascript
// src/api/verification/services/storageService.js
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export const storeVerificationResult = async (result) => {
  const params = {
    TableName: process.env.VERIFICATIONS_TABLE,
    Item: {
      id: `${result.idPhotoKey}-${result.selfiePhotoKey}`,
      ...result,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days retention
    }
  };
  
  await dynamodb.put(params).promise();
};
```

### 5. Create Metrics Service
```javascript
// src/api/verification/services/metricsService.js
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

export const trackMetrics = async (metrics) => {
  const params = {
    MetricData: [
      {
        MetricName: 'VerificationAttempts',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'Success',
            Value: metrics.success.toString()
          }
        ]
      },
      {
        MetricName: 'SimilarityScore',
        Value: metrics.similarity,
        Unit: 'Percent'
      }
    ],
    Namespace: 'IDVerification'
  };
  
  await cloudwatch.putMetricData(params).promise();
};
```

### 6. Create Application Startup
```javascript
// src/app.ts
import express from 'express';
import { CollectionService } from './api/verification/services/collectionService';

export async function startApp() {
  const app = express();
  const collectionService = new CollectionService();

  // Initialize Rekognition collection
  await collectionService.initialize();

  // Configure middleware
  app.use(express.json());
  app.use('/api/verify', verificationRoutes);

  return app;
}
```

### 7. Create Route Configuration
```javascript
// src/api/verification/routes/verificationRoutes.js
import express from 'express';
import { verifyPhotos } from '../controllers/verificationController';

const router = express.Router();

router.post('/verify', verifyPhotos);

export default router;
```

## Testing Requirements
1. Unit Tests
```javascript
describe('Collection Service', () => {
  test('initializes collection on startup', async () => {
    // Test implementation
  });
  
  test('handles existing collection', async () => {
    // Test implementation
  });
  
  test('handles initialization errors', async () => {
    // Test implementation
  });
});

describe('Verification Processing', () => {
  test('handles successful match', async () => {
    // Test implementation
  });
  
  test('handles no match found', async () => {
    // Test implementation
  });
  
  test('handles threshold comparison', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```javascript
describe('Verification API Integration', () => {
  test('processes verification successfully', async () => {
    // Test implementation
  });
  
  test('handles Rekognition errors', async () => {
    // Test implementation
  });
  
  test('stores results correctly', async () => {
    // Test implementation
  });
  
  test('handles missing collection', async () => {
    // Test implementation
  });
});
```

## Documentation Requirements
1. API Documentation
   - Collection initialization process
   - Endpoint specifications
   - Request/response formats
   - Error codes and messages
   - Example requests

2. Integration Guide
   - AWS service setup
   - Environment variables
   - Testing procedures
   - Monitoring setup

## Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] API documentation complete
- [ ] Error handling tested
- [ ] Security review completed
- [ ] Performance tested
- [ ] Metrics tracking verified
- [ ] Branch up to date with verify-project

## Notes
- Collection initialization happens at application startup
- Monitor Rekognition API usage and costs
- Consider implementing result caching
- Document retry strategies
- Monitor performance metrics

## Estimated Time
6-8 hours

## Dependencies
- Task 001 (AWS Base Infrastructure)
- Task 002 (Storage Configuration)
- Task 003 (Photo Upload API)

## Next Steps
After this task is completed, proceed with:
1. Image Quality Validation (005-image-quality)
2. ID Document Processing (006-id-processing)
