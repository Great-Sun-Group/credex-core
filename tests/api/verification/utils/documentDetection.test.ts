const mockRekognitionSend = jest.fn();
const mockTextractSend = jest.fn();

jest.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: jest.fn().mockImplementation(() => ({
    send: mockRekognitionSend
  })),
  DetectLabelsCommand: jest.fn().mockImplementation((input) => ({
    input,
    constructor: { name: 'DetectLabelsCommand' }
  }))
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

jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined)
  }
}));

import { detectDocumentEdges, validateDocumentAlignment } from '../../../../src/api/verification/utils/documentDetection';
import { auditLogger } from '../../../../src/utils/auditLogger';

describe('Document Detection', () => {
  const mockBuffer = Buffer.from('mock image data');

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.log as jest.Mock).mockClear();
  });

  describe('detectDocumentEdges', () => {
    it('should detect document edges successfully', async () => {
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

      const result = await detectDocumentEdges(mockBuffer);
      expect(result.hasDocument).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.corners).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle no document detected', async () => {
      // Setup mock response with no document labels
      mockRekognitionSend.mockResolvedValueOnce({
        Labels: [{
          Name: 'Person',
          Confidence: 95.5
        }]
      });

      const result = await detectDocumentEdges(mockBuffer);
      expect(result.hasDocument).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('No document detected');
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle no document boundaries', async () => {
      // Setup mock responses
      mockRekognitionSend.mockResolvedValueOnce({
        Labels: [{
          Name: 'ID Card',
          Confidence: 95.5
        }]
      });

      mockTextractSend.mockResolvedValueOnce({
        Blocks: []
      });

      const result = await detectDocumentEdges(mockBuffer);
      expect(result.hasDocument).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('No document boundaries detected');
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Setup mock to throw error
      mockRekognitionSend.mockRejectedValueOnce(new Error('Detection failed'));

      const result = await detectDocumentEdges(mockBuffer);
      expect(result.hasDocument).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Document detection failed: Detection failed');
    });
  });

  describe('validateDocumentAlignment', () => {
    const mockCorners = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.6 },
      { x: 0.1, y: 0.6 }
    ];

    it('should validate well-aligned document', () => {
      const result = validateDocumentAlignment(mockCorners);
      expect(result).toBe(true);
    });

    it('should reject document with wrong number of corners', () => {
      const invalidCorners = mockCorners.slice(0, 3);
      const result = validateDocumentAlignment(invalidCorners);
      expect(result).toBe(false);
    });

    it('should reject skewed document', () => {
      const skewedCorners = [
        { x: 0.1, y: 0.1 },
        { x: 0.8, y: 0.2 },
        { x: 0.7, y: 0.8 },
        { x: 0.0, y: 0.7 }
      ];
      const result = validateDocumentAlignment(skewedCorners);
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const result = validateDocumentAlignment(null as any);
      expect(result).toBe(false);
      expect(auditLogger.log).toHaveBeenCalled();
    });
  });
});
