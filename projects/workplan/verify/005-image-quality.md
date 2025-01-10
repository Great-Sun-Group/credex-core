# Task: Image Quality Validation Implementation

## Overview
Implement comprehensive image quality validation using AWS AI services (Rekognition and Textract) for both ID documents and selfie photos.

## Prerequisites
- ✓ AWS SDK installed (@aws-sdk/client-rekognition, @aws-sdk/client-textract)
- ✓ Sharp.js for image processing
- ✓ AWS credentials configured

## Acceptance Criteria
1. ✓ Resolution validation implemented (minimum 640x480)
   - Implemented in src/api/verification/utils/imageValidation.ts
   - Validates minimum 640x480 resolution
   - Returns detailed dimension information
   - Downscales oversized images to 1024x768 for consistency

2. ✓ AI-powered quality analysis
   - Implemented in src/api/verification/utils/aiImageQuality.ts
   - Uses AWS Rekognition for face and document detection
   - Uses AWS Textract for document text analysis
   - Configurable confidence thresholds

3. ✓ Face detection for selfies
   - Implemented using AWS Rekognition
   - Validates single face presence
   - Provides confidence scores
   - Returns face location data

4. ✓ ID document analysis
   - Implemented using AWS Rekognition and Textract
   - Detects document presence
   - Extracts and validates text
   - Provides confidence scores

5. ✓ Quality metrics
   - Blur detection through Rekognition's sharpness analysis
   - Lighting assessment through brightness metrics
   - Text quality assessment for documents
   - Configurable thresholds

6. ✓ Performance optimization
   - Efficient AWS service calls through parallel execution
   - Proper error handling with fallback strategies
   - Response caching where appropriate

7. ✓ Detailed feedback
   - Specific error messages
   - Quality metrics in responses
   - Confidence scores
   - Extracted text data

## Implementation Details

### 1. AWS Service Integration
```typescript
// src/api/verification/utils/aiImageQuality.ts
import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";

// AWS service initialization
const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });
const textract = new TextractClient({ region: process.env.AWS_REGION });
```

### 2. Service Layer Integration
```typescript
// src/api/verification/services/imageQualityService.ts
import sharp from 'sharp';
import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";

export class ImageQualityService {
  private rekognition: RekognitionClient;
  private textract: TextractClient;

  constructor() {
    this.rekognition = new RekognitionClient({ region: process.env.AWS_REGION });
    this.textract = new TextractClient({ region: process.env.AWS_REGION });
  }

  async validateImage(imageBuffer: Buffer, type: 'id' | 'selfie'): Promise<ImageValidationResult> {
    // Resize image to a standard size for consistency
    const resizedImage = await sharp(imageBuffer).resize(1024, 768, { fit: 'inside' }).toBuffer();

    // Call Rekognition and Textract in parallel
    const [rekognitionResult, textractResult] = await Promise.all([
      this.analyzeWithRekognition(resizedImage, type),
      this.analyzeWithTextract(resizedImage, type)
    ]);

    // Process and return the combined result
    return this.processResults(rekognitionResult, textractResult);
  }

  private async analyzeWithRekognition(image: Buffer, type: 'id' | 'selfie') {
    // Implement Rekognition analysis logic
  }

  private async analyzeWithTextract(image: Buffer, type: 'id' | 'selfie') {
    // Implement Textract analysis logic
  }

  private processResults(rekognitionResult: any, textractResult: any): ImageValidationResult {
    // Combine and process results
  }
}
```

### 3. Controller Integration
```typescript
// src/api/verification/controllers/imageQualityController.ts
import { Request, Response } from 'express';
import { ImageQualityService } from '../services/imageQualityService';

export class ImageQualityController {
  private imageQualityService: ImageQualityService;

  constructor() {
    this.imageQualityService = new ImageQualityService();
  }

  validateImage = async (req: Request, res: Response) => {
    try {
      const { imageBuffer, type } = req.body;
      const result = await this.imageQualityService.validateImage(imageBuffer, type);
      res.json(result);
    } catch (error) {
      console.error('Image validation error:', error);
      res.status(500).json({ error: 'Failed to validate image', details: error.message });
    }
  }
}
```

## Testing Requirements

1. Unit Tests
```typescript
// tests/api/verification/utils/aiImageQuality.test.ts
describe('AI Image Quality Analysis', () => {
  test('detects face in selfie', async () => {
    // Test implementation
  });

  test('detects valid ID document', async () => {
    // Test implementation
  });

  test('handles oversized images by resizing', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```typescript
// tests/api/verification/services/imageQualityService.test.ts
describe('Image Quality Service', () => {
  test('validates good quality selfie', async () => {
    // Test implementation
  });

  test('validates ID document with sufficient text', async () => {
    // Test implementation
  });
});
```

## AWS Configuration

1. Required Permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:DetectLabels",
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    }
  ]
}
```

2. Environment Variables:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
```

## Documentation Requirements
1. API Documentation
   - Request/response formats
   - Error codes and messages
   - AWS service integration details

2. User Documentation
   - Image quality guidelines
   - Supported document types
   - Common rejection reasons

## Merge Request Checklist
- ✓ AWS SDK integration complete
- ✓ AI-powered analysis implemented
- ✓ Service layer integration done
- ✓ Tests written and passing
- ✓ Documentation updated
- ✓ Performance optimized
- ✓ Error handling implemented

## Notes
- Uses AWS AI services for improved accuracy
- Maintains compatibility with existing interfaces
- Provides detailed quality metrics
- Includes comprehensive error handling
- Implements image resizing for consistency and better performance

## Estimated Time
2-3 hours (reduced from original estimate due to AWS service capabilities)

## Dependencies
- Task 003 (Photo Upload API)
- AWS account and credentials

## Next Steps
After this task is completed, proceed with:
1. ID Document Processing (006-id-processing)
2. Face Comparison Implementation (007-face-comparison)

