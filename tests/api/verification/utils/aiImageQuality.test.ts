const mockSharpFn = jest.fn();
const mockRekognitionSend = jest.fn();
const mockTextractSend = jest.fn();

jest.mock('sharp', () => {
  return Object.assign(mockSharpFn, { AUTO: 'auto' });
});

jest.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: jest.fn().mockImplementation(() => ({
    send: mockRekognitionSend
  })),
  DetectFacesCommand: jest.fn().mockImplementation((input) => ({
    input,
    constructor: { name: 'DetectFacesCommand' }
  })),
  DetectLabelsCommand: jest.fn().mockImplementation((input) => ({
    input,
    constructor: { name: 'DetectLabelsCommand' }
  })),
  QualityFilter: {
    AUTO: 'AUTO',
    NONE: 'NONE',
    HIGH: 'HIGH'
  },
  Attribute: {
    ALL: 'ALL'
  }
}));

jest.mock('@aws-sdk/client-textract', () => ({
  TextractClient: jest.fn().mockImplementation(() => ({
    send: mockTextractSend
  })),
  AnalyzeDocumentCommand: jest.fn().mockImplementation((input) => ({
    input,
    constructor: { name: 'AnalyzeDocumentCommand' }
  })),
  FeatureType: {
    FORMS: 'FORMS',
    TABLES: 'TABLES'
  }
}));

import { analyzeImageQuality } from '../../../../src/api/verification/utils/aiImageQuality';
import { ImageQualityConfig } from '../../../../src/api/verification/types';

describe('AI Image Quality Analysis', () => {
  const config: ImageQualityConfig = {
    minWidth: 640,
    minHeight: 480,
    blurThreshold: 50,
    minBrightness: 30,
    maxBrightness: 70,
    faceConfidenceThreshold: 90,
    documentConfidenceThreshold: 90
  };

  const mockBuffer = Buffer.from('mock jpeg data');

  beforeEach(() => {
    jest.clearAllMocks();
    mockSharpFn.mockImplementation(() => ({
      metadata: jest.fn().mockResolvedValue({
        format: 'jpeg',
        width: 1920,
        height: 1080,
        size: 500000
      }),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock jpeg data'))
    }));
  });

  test('should analyze selfie image quality', async () => {
    // Setup mock response
    mockRekognitionSend.mockResolvedValueOnce({
      FaceDetails: [{
        Confidence: 99.9,
        Quality: {
          Brightness: 50,
          Sharpness: 80
        },
        BoundingBox: {
          Left: 0.1,
          Top: 0.1,
          Width: 0.8,
          Height: 0.8
        }
      }]
    });

    const result = await analyzeImageQuality(mockBuffer, config, 'selfie');
    expect(result.quality).toBe(true);
    expect(result.face?.hasFace).toBe(true);
    expect(result.face?.confidence).toBeGreaterThan(90);
  });

  test('should analyze document image quality', async () => {
    // Setup mock responses
    mockRekognitionSend.mockResolvedValueOnce({
      Labels: [{
        Name: 'ID Card',
        Confidence: 95.5
      }]
    });

    mockTextractSend.mockResolvedValueOnce({
      Blocks: [{
        BlockType: 'PAGE',
        Confidence: 95.5,
        Geometry: {
          BoundingBox: {
            Left: 0.1,
            Top: 0.1,
            Width: 0.8,
            Height: 0.5
          }
        }
      }]
    });

    const result = await analyzeImageQuality(mockBuffer, config, 'id');
    expect(result.quality).toBe(true);
    expect(result.document?.hasDocument).toBe(true);
    expect(result.document?.confidence).toBeGreaterThan(90);
  });

  test('should handle low quality images', async () => {
    // Setup mock response with low quality metrics
    mockRekognitionSend.mockResolvedValueOnce({
      FaceDetails: [{
        Confidence: 50,  // Below faceConfidenceThreshold
        Quality: {
          Brightness: 20,  // Below minBrightness
          Sharpness: 30   // Below blurThreshold
        },
        BoundingBox: {
          Left: 0.1,
          Top: 0.1,
          Width: 0.8,
          Height: 0.8
        }
      }]
    });

    const result = await analyzeImageQuality(mockBuffer, config, 'selfie');
    expect(result.quality).toBe(false);
    expect(result.face?.confidence).toBeLessThan(90);
  });

  test('should handle analysis errors', async () => {
    // Setup mock to throw error
    mockSharpFn.mockImplementationOnce(() => {
      throw new Error('Failed to process image');
    });

    const result = await analyzeImageQuality(mockBuffer, config, 'selfie');
    expect(result.quality).toBe(false);
    expect(result.error).toBe('Failed to analyze image quality');
  });
});
