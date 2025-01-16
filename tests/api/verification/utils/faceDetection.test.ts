const mockSend = jest.fn();

jest.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  DetectFacesCommand: jest.fn().mockImplementation((input) => ({
    input,
    constructor: { name: 'DetectFacesCommand' }
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

jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined)
  }
}));

import { detectFace } from '../../../../src/api/verification/utils/faceDetection';
import { auditLogger } from '../../../../src/utils/auditLogger';

describe('Face Detection Utils', () => {
  const mockBuffer = Buffer.from('mock image data');

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.log as jest.Mock).mockClear();
  });

  test('should detect face in valid image', async () => {
    // Setup mock response
    mockSend.mockResolvedValueOnce({
      FaceDetails: [{
        Confidence: 99.9,
        BoundingBox: {
          Left: 0.1,
          Top: 0.1,
          Width: 0.8,
          Height: 0.8
        },
        Quality: {
          Brightness: 80,
          Sharpness: 90
        }
      }]
    });

    const result = await detectFace(mockBuffer);
    expect(result.hasFace).toBe(true);
    expect(result.confidence).toBeGreaterThan(90);
    expect(result.faceLocation).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  test('should handle image with no face', async () => {
    // Setup mock response
    mockSend.mockResolvedValueOnce({
      FaceDetails: []
    });

    const result = await detectFace(mockBuffer);
    expect(result.hasFace).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.faceLocation).toBeUndefined();
    expect(result.error).toBe('No face detected in image');
  });

  test('should handle detection errors', async () => {
    // Setup mock response
    mockSend.mockRejectedValueOnce(new Error('Detection failed'));

    const result = await detectFace(mockBuffer);
    expect(result.hasFace).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.faceLocation).toBeUndefined();
    expect(result.error).toBe('Face detection failed: Detection failed');
  });
});
