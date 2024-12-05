# Task: Image Quality Validation Implementation

## Overview
Implement comprehensive image quality validation including resolution verification, blur detection, and lighting assessment for both ID documents and selfie photos.

## Prerequisites
- ✓ Sharp.js for image processing (already integrated in imageQuality.ts and imageValidation.ts)
- OpenCV.js for advanced image analysis (needed for face/document detection)
- Access to test image dataset

## Acceptance Criteria
1. ✓ Resolution validation implemented (minimum 640x480)
   - Implemented in src/api/verification/utils/imageValidation.ts
   - Validates minimum 640x480 resolution
   - Returns detailed dimension information

2. ✓ Blur detection with configurable threshold
   - Implemented in src/api/verification/utils/imageQuality.ts
   - Uses Laplacian variance for blur detection
   - Configurable threshold support

3. ✓ Lighting assessment for under/over exposure
   - Implemented in src/api/verification/utils/imageQuality.ts
   - Calculates average brightness
   - Configurable min/max brightness thresholds

4. Face detection for selfies
   - Not implemented yet
   - Requires OpenCV.js integration
   - Will validate single face presence

5. ID document edge detection
   - Not implemented yet
   - Requires OpenCV.js integration
   - Will detect document boundaries

6. Performance optimization for quick validation
   - Partially implemented through existing optimizations in imageQuality.ts
   - Needs enhancement for new features

7. ✓ Detailed feedback for failed validations
   - Implemented across imageQuality.ts and imageValidation.ts
   - Returns specific error messages and details
   - Includes quality metrics in responses

## Implementation Steps

### 1. Create Face Detection Functions
```javascript
// src/api/verification/utils/faceDetection.ts
import cv from 'opencv4nodejs';
import { FaceDetectionResult } from '../types';

export async function detectFace(imageBuffer: Buffer): Promise<FaceDetectionResult> {
  // Implementation for face detection
  const image = await cv.imdecodeAsync(imageBuffer);
  // Face detection logic
  return {
    hasFace: boolean,
    confidence: number,
    faceLocation: { x: number, y: number, width: number, height: number }
  };
}

export async function validateFacePosition(
  faceLocation: { x: number, y: number, width: number, height: number }
): Promise<boolean> {
  // Validate if face is properly centered and sized
  return true;
}
```

### 2. Create Document Edge Detection Functions
```javascript
// src/api/verification/utils/documentDetection.ts
import cv from 'opencv4nodejs';
import { DocumentDetectionResult } from '../types';

export async function detectDocumentEdges(imageBuffer: Buffer): Promise<DocumentDetectionResult> {
  // Implementation for document edge detection
  const image = await cv.imdecodeAsync(imageBuffer);
  // Edge detection logic
  return {
    hasDocument: boolean,
    corners: [
      { x: number, y: number },
      { x: number, y: number },
      { x: number, y: number },
      { x: number, y: number }
    ],
    confidence: number
  };
}

export async function validateDocumentAlignment(
  corners: Array<{ x: number, y: number }>
): Promise<boolean> {
  // Validate if document is properly aligned
  return true;
}
```

### 3. Update Image Quality Functions
```typescript
// src/api/verification/utils/imageQuality.ts
import { detectFace, validateFacePosition } from './faceDetection';
import { detectDocumentEdges, validateDocumentAlignment } from './documentDetection';
import { detectBlur, assessLighting } from './imageQuality';

export async function validateImage(
  imageBuffer: Buffer,
  type: 'selfie' | 'document'
): Promise<ValidationResult> {
  // Combine all quality checks
  const qualityResults = await Promise.all([
    detectBlur(imageBuffer),
    assessLighting(imageBuffer),
    type === 'selfie' ? detectFace(imageBuffer) : detectDocumentEdges(imageBuffer)
  ]);

  return {
    isValid: boolean,
    qualityMetrics: {
      blur: number,
      brightness: number,
      // Additional metrics based on type
    },
    errors: string[]
  };
}
```

## Testing Requirements
1. Unit Tests for New Features
```typescript
describe('Face Detection', () => {
  test('detects single face in selfie', async () => {
    const imageBuffer = await readTestImage('valid-selfie.jpg');
    const result = await detectFace(imageBuffer);
    expect(result.hasFace).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});

describe('Document Edge Detection', () => {
  test('detects document boundaries', async () => {
    const imageBuffer = await readTestImage('valid-document.jpg');
    const result = await detectDocumentEdges(imageBuffer);
    expect(result.hasDocument).toBe(true);
    expect(result.corners).toHaveLength(4);
  });
});
```

2. Performance Tests
```typescript
describe('Performance', () => {
  test('completes validation within 500ms', async () => {
    const startTime = Date.now();
    await validateImage(testImageBuffer, 'selfie');
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500);
  });
});
```

Note: Existing quality check tests can be found in:
- tests/api/endpoints/verification/uploadPhoto.test.ts
- tests/api/integration/verification/photoUpload.integration.test.ts

## Documentation Requirements
1. Technical Documentation
   - Face detection parameters
   - Document edge detection algorithm
   - Performance optimization techniques

2. User Documentation
   - Face photo guidelines
   - Document photo guidelines
   - Common rejection reasons

## Merge Request Checklist
- [ ] OpenCV.js integration complete
- [ ] Face detection implemented and tested
- [ ] Document edge detection implemented and tested
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Memory usage optimized
- [ ] Branch up to date with verify-project

## Notes
- Leverage existing image processing utilities in imageQuality.ts
- Consider caching detection results
- Monitor memory usage with OpenCV
- Document performance impact

## Estimated Time
3-4 hours (reduced from original 4-6 hours as core quality checks are already implemented)

## Dependencies
- Task 003 (Photo Upload API)

## Next Steps
After this task is completed, proceed with:
1. ID Document Processing (006-id-processing)
2. Face Comparison Implementation (007-face-comparison)
