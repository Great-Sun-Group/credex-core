import { analyzeImageQuality } from '../../../../src/api/verification/utils/aiImageQuality';
import { readFileSync } from 'fs';
import { join } from 'path';
import AWS from 'aws-sdk';

jest.mock('aws-sdk', () => ({
  Rekognition: jest.fn(() => ({
    detectFaces: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        FaceDetails: [{
          Confidence: 99.9,
          Quality: {
            Brightness: 80,
            Sharpness: 90
          }
        }]
      })
    }),
    detectLabels: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Labels: [{
          Name: 'ID Card',
          Confidence: 98.5
        }]
      })
    })
  })),
  Textract: jest.fn(() => ({
    analyzeDocument: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Blocks: [{
          BlockType: 'LINE',
          Confidence: 95,
          Text: 'Sample ID Text'
        }]
      })
    })
  }))
}));

describe('AI Image Quality Analysis', () => {
  const validConfig = {
    minWidth: 640,
    minHeight: 480,
    blurThreshold: 0.3,
    minBrightness: 0.2,
    maxBrightness: 0.8,
    faceConfidenceThreshold: 90,
    documentConfidenceThreshold: 90
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('detects face in selfie', async () => {
    const selfieBuffer = readFileSync(join(__dirname, '../../../fixtures/verification/valid-selfie.jpg'));
    const result = await analyzeImageQuality(selfieBuffer, validConfig, 'selfie');
    
    expect(result.quality).toBe(true);
    expect(result.face?.confidence).toBeGreaterThan(90);
    expect(result.face?.hasFace).toBe(true);
  });

  test('detects valid ID document', async () => {
    const idBuffer = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
    const result = await analyzeImageQuality(idBuffer, validConfig, 'id');
    
    expect(result.quality).toBe(true);
    expect(result.document?.confidence).toBeGreaterThan(90);
    expect(result.documentText?.confidence).toBeGreaterThan(90);
  });

  test('handles oversized images by resizing', async () => {
    const largeBuffer = readFileSync(join(__dirname, '../../../fixtures/verification/large-image.jpg'));
    
    const result = await analyzeImageQuality(largeBuffer, validConfig, 'selfie');
    
    // Verify image was processed
    expect(result.quality).toBeDefined();
    expect(AWS.Rekognition).toHaveBeenCalled();
  });
});
