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

### 1. Reuse Image Quality Validation Service
Instead of duplicating image quality validation logic, import and reuse the shared service created in Task 005:

```typescript
// src/api/verification/services/faceComparison.ts
import { validateImageQuality } from './imageQualityService';
import {
  RekognitionClient,
  CompareFacesCommand,
  QualityFilter
} from "@aws-sdk/client-rekognition";
import { MetricsService } from './metrics';
import { FaceComparison } from '../types';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });
const SIMILARITY_THRESHOLD = 90;
const MAX_FACES = 1;

export async function compareFaces(
  sourceImage: Buffer,
  targetImage: Buffer
): Promise<FaceComparison.Result> {
  try {
    // Reuse quality validation from Task 005
    const [sourceQuality, targetQuality] = await Promise.all([
      validateImageQuality(sourceImage),
      validateImageQuality(targetImage)
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

    // Perform face comparison
    const comparisonResult = await performComparison(sourceImage, targetImage);

    // Track metrics
    await trackComparisonMetrics(comparisonResult);

    return comparisonResult;
  } catch (error) {
    console.error('Face comparison error:', error);
    throw new Error('Failed to compare faces');
  }
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

### 2. Update Metrics Service
Ensure that the metrics service is optimized for handling high API usage.

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

### 3. Testing Requirements

#### Unit Tests
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

#### Integration Tests
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

### 4. Documentation Requirements
1. **Technical Documentation**
   - Face comparison process
   - Quality thresholds
   - Metric tracking
   - Performance optimization

2. **User Documentation**
   - Face photo guidelines
   - Common failure reasons
   - Troubleshooting steps

### 5. Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Error handling tested
- [ ] Metrics tracking verified
- [ ] Branch up to date with verify-project

### 6. Notes
- Monitor Rekognition API usage
- Reuse image quality validation logic from Task 005
- Document threshold configurations
- Monitor false positive/negative rates
- Handle edge cases gracefully

### Estimated Time
8-12 hours

## Dependencies
- Task 004 (Verification API)
- Task 005 (Image Quality Validation)

## Next Steps
After this task is completed, proceed with:
1. Security Implementation (008-security-setup)
2. Fraud Detection System (009-fraud-detection)

