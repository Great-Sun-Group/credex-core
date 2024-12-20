# Task: Face Comparison Implementation

## Overview
Implement face comparison functionality using AWS Rekognition, focusing on accurate face detection, quality assessment, and similarity comparison.

## Prerequisites
- Completed Task 004 (Verification API)
- Completed Task 005 (Image Quality Validation)
- AWS Rekognition access configured
- Test dataset of face pairs

## Acceptance Criteria
1. Face detection in both ID and selfie images
2. Accurate face comparison with 90% threshold
3. Multiple face detection handling
4. Face position and quality assessment
5. Detailed comparison metrics
6. Performance optimization
7. Error handling for edge cases

## Implementation Steps

### 1. Create Face Comparison Functions
```typescript
// src/api/verification/services/faceComparison.ts
import { 
  RekognitionClient, 
  CompareFacesCommand,
  DetectFacesCommand,
  QualityFilter,
  Attribute
} from "@aws-sdk/client-rekognition";
import { MetricsService } from './metrics';
import { FaceComparison } from '../types';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });
const SIMILARITY_THRESHOLD = 90;
const QUALITY_THRESHOLD = 0.85;
const MAX_FACES = 1;

export async function compareFaces(
  sourceImage: Buffer,
  targetImage: Buffer
): Promise<FaceComparison.Result> {
  try {
    // Validate face quality
    const [sourceQuality, targetQuality] = await Promise.all([
      validateFaceQuality(sourceImage),
      validateFaceQuality(targetImage)
    ]);

    if (!sourceQuality.pass || !targetQuality.pass) {
      return {
        success: false,
        error: 'Face quality requirements not met',
        details: {
          source: sourceQuality,
          target: targetQuality
        }
      };
    }

    // Perform comparison
    const comparisonResult = await performComparison(sourceImage, targetImage);

    // Track metrics
    await trackComparisonMetrics(comparisonResult);

    return comparisonResult;
  } catch (error) {
    console.error('Face comparison error:', error);
    throw new Error('Failed to compare faces');
  }
}

async function validateFaceQuality(image: Buffer): Promise<FaceComparison.QualityResult> {
  const command = new DetectFacesCommand({
    Image: { Bytes: image },
    Attributes: [Attribute.QUALITY, Attribute.POSE, Attribute.LANDMARKS]
  });

  const response = await rekognition.send(command);

  if (response.FaceDetails.length === 0) {
    return {
      pass: false,
      error: 'No face detected'
    };
  }

  if (response.FaceDetails.length > MAX_FACES) {
    return {
      pass: false,
      error: 'Multiple faces detected'
    };
  }

  const face = response.FaceDetails[0];
  const qualityScore = calculateQualityScore(face.Quality);

  return {
    pass: qualityScore >= QUALITY_THRESHOLD,
    score: qualityScore,
    details: {
      quality: face.Quality,
      pose: face.Pose,
      landmarks: face.Landmarks
    }
  };
}

function calculateQualityScore(quality: any): number {
  const weights = {
    Brightness: 0.3,
    Sharpness: 0.4,
    Confidence: 0.3
  };

  return Object.entries(weights).reduce((score, [metric, weight]) => {
    return score + (quality[metric] / 100 * weight);
  }, 0);
}

async function performComparison(
  sourceImage: Buffer,
  targetImage: Buffer
): Promise<FaceComparison.ComparisonResult> {
  const command = new CompareFacesCommand({
    SourceImage: { Bytes: sourceImage },
    TargetImage: { Bytes: targetImage },
    SimilarityThreshold: SIMILARITY_THRESHOLD,
    QualityFilter: QualityFilter.HIGH
  });

  const response = await rekognition.send(command);

  if (response.FaceMatches.length === 0) {
    return {
      success: false,
      error: 'No matching faces found',
      similarity: 0
    };
  }

  const match = response.FaceMatches[0];
  const similarity = Math.round(match.Similarity * 100) / 100;

  return {
    success: true,
    similarity,
    verified: similarity >= SIMILARITY_THRESHOLD,
    details: {
      boundingBox: match.Face.BoundingBox,
      confidence: match.Face.Confidence,
      pose: match.Face.Pose
    }
  };
}

async function trackComparisonMetrics(result: FaceComparison.ComparisonResult): Promise<void> {
  await MetricsService.record({
    metricName: 'FaceComparison',
    dimensions: {
      Result: result.verified ? 'Verified' : 'Failed'
    },
    value: result.similarity
  });

  await MetricsService.incrementCounter(
    result.verified ? 'SuccessfulVerifications' : 'FailedVerifications'
  );
}
```

### 2. Create Types
```typescript
// src/api/verification/types/faceComparison.ts
export namespace FaceComparison {
  export interface QualityResult {
    pass: boolean;
    error?: string;
    score?: number;
    details?: {
      quality: any;
      pose: any;
      landmarks: any;
    };
  }

  export interface ComparisonResult {
    success: boolean;
    error?: string;
    similarity: number;
    verified?: boolean;
    details?: {
      boundingBox: any;
      confidence: number;
      pose: any;
    };
  }

  export type Result = ComparisonResult | {
    success: false;
    error: string;
    details: {
      source: QualityResult;
      target: QualityResult;
    };
  };
}
```

### 3. Create Metrics Service
```typescript
// src/api/verification/services/metrics.ts
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });
const NAMESPACE = 'FaceVerification';

export const MetricsService = {
  async record(params: {
    metricName: string;
    dimensions: Record<string, string>;
    value: number;
  }): Promise<void> {
    const command = new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [{
        MetricName: params.metricName,
        Value: params.value,
        Unit: 'None',
        Dimensions: Object.entries(params.dimensions).map(([Name, Value]) => ({
          Name,
          Value
        }))
      }]
    });

    await cloudwatch.send(command);
  },

  async incrementCounter(metricName: string): Promise<void> {
    await this.record({
      metricName,
      value: 1,
      dimensions: {
        Type: 'Count'
      }
    });
  }
};
```

## Testing Requirements
1. Unit Tests
```typescript
describe('Face Comparison', () => {
  test('validates face quality correctly', async () => {
    // Test implementation
  });
  
  test('handles multiple faces appropriately', async () => {
    // Test implementation
  });
  
  test('compares faces accurately', async () => {
    // Test implementation
  });
  
  test('tracks metrics properly', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```typescript
describe('Face Comparison Integration', () => {
  test('processes matching faces successfully', async () => {
    // Test implementation
  });
  
  test('handles non-matching faces correctly', async () => {
    // Test implementation
  });
  
  test('manages edge cases appropriately', async () => {
    // Test implementation
  });
});
```

## Documentation Requirements
1. Technical Documentation
   - Face comparison process
   - Quality thresholds
   - Metric tracking
   - Performance optimization

2. User Documentation
   - Face photo guidelines
   - Common failure reasons
   - Troubleshooting steps

## Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Error handling tested
- [ ] Metrics tracking verified
- [ ] Branch up to date with verify-project

## Notes
- Monitor Rekognition API usage
- Consider caching comparison results
- Document threshold configurations
- Monitor false positive/negative rates
- Handle edge cases gracefully

## Estimated Time
4-6 hours

## Dependencies
- Task 004 (Verification API)
- Task 005 (Image Quality Validation)

## Next Steps
After this task is completed, proceed with:
1. Security Implementation (008-security-setup)
2. Fraud Detection System (009-fraud-detection)
