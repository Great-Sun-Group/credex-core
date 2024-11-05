# Task: Face Comparison Implementation

## Overview
Implement face comparison functionality using AWS Rekognition, including similarity threshold management, face detection optimization, and result handling.

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

### 1. Create Face Comparison Service
```javascript
// src/api/verification/services/faceComparisonService.js
import AWS from 'aws-sdk';
import { validateFaceQuality } from '../utils/faceQuality';
import { MetricsService } from './metricsService';

const rekognition = new AWS.Rekognition();
const metrics = new MetricsService();

export class FaceComparison {
  constructor(config = {}) {
    this.similarityThreshold = config.similarityThreshold || 90;
    this.qualityThreshold = config.qualityThreshold || 0.85;
    this.maxFaces = config.maxFaces || 1;
  }

  async compareFaces(sourceImage, targetImage) {
    try {
      // Validate face quality
      const sourceQuality = await this.validateFaceQuality(sourceImage);
      const targetQuality = await this.validateFaceQuality(targetImage);

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
      const comparisonResult = await this.performComparison(sourceImage, targetImage);

      // Track metrics
      await this.trackComparisonMetrics(comparisonResult);

      return comparisonResult;
    } catch (error) {
      console.error('Face comparison error:', error);
      throw new Error('Failed to compare faces');
    }
  }

  async validateFaceQuality(image) {
    const params = {
      Image: {
        Bytes: image
      },
      Attributes: ['Quality']
    };

    const response = await rekognition.detectFaces(params).promise();

    if (response.FaceDetails.length === 0) {
      return {
        pass: false,
        error: 'No face detected'
      };
    }

    if (response.FaceDetails.length > this.maxFaces) {
      return {
        pass: false,
        error: 'Multiple faces detected'
      };
    }

    const face = response.FaceDetails[0];
    const qualityScore = this.calculateQualityScore(face.Quality);

    return {
      pass: qualityScore >= this.qualityThreshold,
      score: qualityScore,
      details: face.Quality
    };
  }

  calculateQualityScore(quality) {
    const weights = {
      Brightness: 0.3,
      Sharpness: 0.4,
      Confidence: 0.3
    };

    return Object.entries(weights).reduce((score, [metric, weight]) => {
      return score + (quality[metric] / 100 * weight);
    }, 0);
  }

  async performComparison(sourceImage, targetImage) {
    const params = {
      SourceImage: {
        Bytes: sourceImage
      },
      TargetImage: {
        Bytes: targetImage
      },
      SimilarityThreshold: this.similarityThreshold,
      QualityFilter: 'HIGH'
    };

    const response = await rekognition.compareFaces(params).promise();

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
      verified: similarity >= this.similarityThreshold,
      details: {
        boundingBox: match.Face.BoundingBox,
        confidence: match.Face.Confidence,
        pose: match.Face.Pose
      }
    };
  }

  async trackComparisonMetrics(result) {
    await metrics.record({
      metricName: 'FaceComparison',
      dimensions: {
        Result: result.verified ? 'Verified' : 'Failed'
      },
      value: result.similarity
    });

    if (result.verified) {
      await metrics.incrementCounter('SuccessfulVerifications');
    } else {
      await metrics.incrementCounter('FailedVerifications');
    }
  }
}
```

### 2. Create Face Quality Utility
```javascript
// src/api/verification/utils/faceQuality.js
export const validateFaceQuality = async (face) => {
  const qualityChecks = {
    pose: validatePose(face.Pose),
    confidence: validateConfidence(face.Confidence),
    quality: validateQualityMetrics(face.Quality)
  };

  return {
    pass: Object.values(qualityChecks).every(check => check.pass),
    checks: qualityChecks
  };
};

const validatePose = (pose) => {
  const maxAngle = 15;
  return {
    pass: Math.abs(pose.Pitch) < maxAngle && 
          Math.abs(pose.Roll) < maxAngle && 
          Math.abs(pose.Yaw) < maxAngle,
    angles: {
      pitch: pose.Pitch,
      roll: pose.Roll,
      yaw: pose.Yaw
    }
  };
};

const validateConfidence = (confidence) => ({
  pass: confidence >= 95,
  value: confidence
});

const validateQualityMetrics = (quality) => ({
  pass: quality.Brightness >= 80 && quality.Sharpness >= 80,
  metrics: {
    brightness: quality.Brightness,
    sharpness: quality.Sharpness
  }
});
```

### 3. Create Metrics Service
```javascript
// src/api/verification/services/metricsService.js
import { CloudWatch } from 'aws-sdk';

export class MetricsService {
  constructor() {
    this.cloudwatch = new CloudWatch();
    this.namespace = 'FaceVerification';
  }

  async record(params) {
    await this.cloudwatch.putMetricData({
      Namespace: this.namespace,
      MetricData: [{
        MetricName: params.metricName,
        Value: params.value,
        Unit: 'None',
        Dimensions: Object.entries(params.dimensions).map(([Name, Value]) => ({
          Name,
          Value
        }))
      }]
    }).promise();
  }

  async incrementCounter(metricName) {
    await this.record({
      metricName,
      value: 1,
      dimensions: {
        Type: 'Count'
      }
    });
  }
}
```

## Testing Requirements
1. Unit Tests
```javascript
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
```javascript
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

## Estimated Time
5-7 hours

## Dependencies
- Task 004 (Verification API)
- Task 005 (Image Quality Validation)

## Next Steps
After this task is completed, proceed with:
1. Security Implementation (008-security-setup)
2. Fraud Detection System (009-fraud-detection)
