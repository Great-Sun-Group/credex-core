# Task: Image Quality Validation Implementation

## Overview
Implement comprehensive image quality validation including resolution verification, blur detection, and lighting assessment for both ID documents and selfie photos.

## Prerequisites
- Completed Task 003 (Photo Upload API)
- Sharp.js for image processing
- OpenCV.js for advanced image analysis
- Access to test image dataset

## Acceptance Criteria
1. Resolution validation implemented (minimum 640x480)
2. Blur detection with configurable threshold
3. Lighting assessment for under/over exposure
4. Face detection for selfies
5. ID document edge detection
6. Performance optimization for quick validation
7. Detailed feedback for failed validations

## Implementation Steps

### 1. Create Quality Validation Service
```javascript
// src/api/verification/services/qualityValidationService.js
import sharp from 'sharp';
import cv from 'opencv4nodejs';
import { detectFace } from './faceDetectionService';

export class ImageQualityValidator {
  constructor(config = {}) {
    this.minWidth = config.minWidth || 640;
    this.minHeight = config.minHeight || 480;
    this.blurThreshold = config.blurThreshold || 100;
    this.brightnessRange = config.brightnessRange || { min: 0.15, max: 0.85 };
  }

  async validateImage(buffer, type) {
    try {
      const results = {
        resolution: await this.checkResolution(buffer),
        blur: await this.detectBlur(buffer),
        lighting: await this.assessLighting(buffer)
      };

      if (type === 'selfie') {
        results.face = await this.validateFace(buffer);
      } else if (type === 'id') {
        results.document = await this.validateDocument(buffer);
      }

      return this.aggregateResults(results);
    } catch (error) {
      console.error('Quality validation error:', error);
      throw new Error('Failed to validate image quality');
    }
  }

  async checkResolution(buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
      pass: metadata.width >= this.minWidth && metadata.height >= this.minHeight,
      details: {
        width: metadata.width,
        height: metadata.height,
        required: `${this.minWidth}x${this.minHeight}`
      }
    };
  }

  async detectBlur(buffer) {
    const image = await cv.imdecodeAsync(buffer);
    const laplacian = image.laplacian(cv.CV_64F);
    const variance = laplacian.variance();
    
    return {
      pass: variance > this.blurThreshold,
      details: {
        variance,
        threshold: this.blurThreshold
      }
    };
  }

  async assessLighting(buffer) {
    const { stats } = await sharp(buffer)
      .greyscale()
      .stats();
    
    const brightness = stats.mean / 255;
    
    return {
      pass: brightness >= this.brightnessRange.min && 
            brightness <= this.brightnessRange.max,
      details: {
        brightness,
        range: this.brightnessRange
      }
    };
  }

  async validateFace(buffer) {
    const faceData = await detectFace(buffer);
    return {
      pass: faceData.faces.length === 1,
      details: {
        facesFound: faceData.faces.length,
        confidence: faceData.faces[0]?.confidence
      }
    };
  }

  async validateDocument(buffer) {
    const image = await cv.imdecodeAsync(buffer);
    const edges = image.canny(50, 150);
    const contours = edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    const documentFound = contours.some(contour => {
      const area = contour.area;
      const rect = contour.boundingRect();
      return area > (image.rows * image.cols * 0.5);
    });

    return {
      pass: documentFound,
      details: {
        edgesDetected: contours.length
      }
    };
  }

  aggregateResults(results) {
    const failed = [];
    let allPassed = true;

    for (const [test, result] of Object.entries(results)) {
      if (!result.pass) {
        allPassed = false;
        failed.push({
          test,
          details: result.details
        });
      }
    }

    return {
      passed: allPassed,
      failed,
      details: results
    };
  }
}
```

### 2. Create Face Detection Service
```javascript
// src/api/verification/services/faceDetectionService.js
import cv from 'opencv4nodejs';

export const detectFace = async (buffer) => {
  const image = await cv.imdecodeAsync(buffer);
  const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
  
  const faces = await classifier.detectMultiScaleAsync(image, {
    minSize: new cv.Size(60, 60),
    scaleFactor: 1.1,
    minNeighbors: 5
  });

  return {
    faces: faces.map(face => ({
      region: face.rect,
      confidence: face.neighbors
    }))
  };
};
```

### 3. Create Quality Validation Middleware
```javascript
// src/api/verification/middleware/qualityValidationMiddleware.js
import { ImageQualityValidator } from '../services/qualityValidationService';

const validator = new ImageQualityValidator({
  minWidth: 640,
  minHeight: 480,
  blurThreshold: 100,
  brightnessRange: { min: 0.15, max: 0.85 }
});

export const validateImageQuality = async (req, res, next) => {
  try {
    const { buffer, type } = req.body;
    
    const validationResult = await validator.validateImage(buffer, type);
    
    if (!validationResult.passed) {
      return res.status(400).json({
        error: 'Image quality requirements not met',
        details: validationResult.failed
      });
    }
    
    req.qualityValidation = validationResult;
    next();
  } catch (error) {
    console.error('Quality validation middleware error:', error);
    return res.status(500).json({
      error: 'Failed to validate image quality'
    });
  }
};
```

## Testing Requirements
1. Unit Tests
```javascript
describe('Image Quality Validation', () => {
  test('validates resolution correctly', async () => {
    // Test implementation
  });
  
  test('detects blur accurately', async () => {
    // Test implementation
  });
  
  test('assesses lighting correctly', async () => {
    // Test implementation
  });
  
  test('validates face detection', async () => {
    // Test implementation
  });
  
  test('validates document edges', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```javascript
describe('Quality Validation Integration', () => {
  test('processes high-quality images successfully', async () => {
    // Test implementation
  });
  
  test('rejects low-quality images with proper feedback', async () => {
    // Test implementation
  });
  
  test('handles edge cases appropriately', async () => {
    // Test implementation
  });
});
```

## Documentation Requirements
1. Technical Documentation
   - Quality validation parameters
   - Threshold configurations
   - Performance considerations
   - Error handling

2. User Documentation
   - Image quality guidelines
   - Common rejection reasons
   - Improvement suggestions

## Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Error handling tested
- [ ] Memory usage optimized
- [ ] Branch up to date with verify-project

## Notes
- Consider caching validation results
- Monitor performance impact
- Document threshold configurations
- Consider cultural variations in ID documents

## Estimated Time
4-6 hours

## Dependencies
- Task 003 (Photo Upload API)

## Next Steps
After this task is completed, proceed with:
1. ID Document Processing (006-id-processing)
2. Face Comparison Implementation (007-face-comparison)
