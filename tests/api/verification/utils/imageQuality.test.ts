// Import necessary modules and functions
import fs from 'fs/promises';
import path from 'path';

// Mock AWS SDK clients
const mockSendRekognition = jest.fn();
const mockSendTextract = jest.fn();

jest.doMock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: jest.fn().mockImplementation(() => ({
    send: mockSendRekognition
  })),
  DetectFacesCommand: jest.fn(),
  DetectLabelsCommand: jest.fn(),
  Attribute: { DEFAULT: 'DEFAULT' }
}));

jest.doMock('@aws-sdk/client-textract', () => ({
  TextractClient: jest.fn().mockImplementation(() => ({
    send: mockSendTextract
  })),
  AnalyzeDocumentCommand: jest.fn(),
  FeatureType: { FORMS: 'FORMS', TABLES: 'TABLES' }
}));

// Import after mocks are set up
const { validateImageQuality } = require('../../../../src/api/verification/utils/imageQuality');

describe('Image Quality Validation', () => {
  const config = {
    minWidth: 640,
    minHeight: 480,
    blurThreshold: 80,
    minBrightness: 30,
    maxBrightness: 70,
    faceConfidenceThreshold: 90,
    documentConfidenceThreshold: 90
  };

  // Mock responses
  const mockGoodFaceResponse = {
    FaceDetails: [{
      Confidence: 99.9,
      Quality: {
        Brightness: 50,
        Sharpness: 90
      },
      BoundingBox: {
        Left: 0.1,
        Top: 0.1,
        Width: 0.8,
        Height: 0.8
      }
    }]
  };

  const mockBlurryFaceResponse = {
    FaceDetails: [{
      Confidence: 95,
      Quality: {
        Brightness: 50,
        Sharpness: 60
      },
      BoundingBox: {
        Left: 0.1,
        Top: 0.1,
        Width: 0.8,
        Height: 0.8
      }
    }]
  };

  const mockDarkFaceResponse = {
    FaceDetails: [{
      Confidence: 95,
      Quality: {
        Brightness: 20,
        Sharpness: 90
      },
      BoundingBox: {
        Left: 0.1,
        Top: 0.1,
        Width: 0.8,
        Height: 0.8
      }
    }]
  };

  const mockGoodDocumentResponse = {
    Labels: [{
      Name: 'ID Card',
      Confidence: 98.5
    }]
  };

  const mockBlurryDocumentResponse = {
    Labels: [{
      Name: 'ID Card',
      Confidence: 95
    }]
  };

  const mockNonDocumentResponse = {
    Labels: [{
      Name: 'Person',
      Confidence: 98.5
    }]
  };

  const mockTextractResponse = {
    Blocks: [
      {
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['KEY'],
        Confidence: 95,
        Relationships: [
          { Ids: ['1'] },
          { Ids: ['2'] }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendRekognition.mockReset();
    mockSendTextract.mockReset();
  });

  describe('Selfie Validation', () => {
    it('should validate good quality selfie', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/valid-selfie.jpg')
      );

      mockSendRekognition.mockResolvedValueOnce(mockGoodFaceResponse);

      const result = await validateImageQuality(imageBuffer, 'selfie', config);

      expect(result.isValid).toBe(true);
      expect(result.details?.face?.hasFace).toBe(true);
      expect(result.details?.face?.confidence).toBeGreaterThan(90);
      expect(result.error).toBeUndefined();
    });

    it('should reject blurry selfie', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/blurry-selfie.jpg')
      );

      mockSendRekognition.mockResolvedValueOnce(mockBlurryFaceResponse);

      const result = await validateImageQuality(imageBuffer, 'selfie', config);

      expect(result.isValid).toBe(false);
      expect(result.details?.blur?.isAcceptable).toBe(false);
      expect(result.error).toContain('Image too blurry');
    });

    it('should reject poorly lit selfie', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/dark-selfie.jpg')
      );

      mockSendRekognition.mockResolvedValueOnce(mockDarkFaceResponse);

      const result = await validateImageQuality(imageBuffer, 'selfie', config);

      expect(result.isValid).toBe(false);
      expect(result.details?.lighting?.isAcceptable).toBe(false);
      expect(result.error).toContain('Poor lighting');
    });
  });

  describe('ID Document Validation', () => {
    it('should validate good quality ID document', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/valid-id.jpg')
      );

      mockSendRekognition.mockResolvedValueOnce(mockGoodDocumentResponse);
      mockSendTextract.mockResolvedValueOnce(mockTextractResponse);

      const result = await validateImageQuality(imageBuffer, 'id', config);

      expect(result.isValid).toBe(true);
      expect(result.details?.document?.hasDocument).toBe(true);
      expect(result.details?.document?.confidence).toBeGreaterThan(90);
      expect(result.error).toBeUndefined();
    });

    it('should reject blurry document', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/blurry-id.jpg')
      );

      mockSendRekognition.mockResolvedValueOnce(mockBlurryDocumentResponse);
      mockSendTextract.mockResolvedValueOnce({ Blocks: [{ Confidence: 60 }] });

      const result = await validateImageQuality(imageBuffer, 'id', config);

      expect(result.isValid).toBe(false);
      expect(result.details?.blur?.isAcceptable).toBe(false);
      expect(result.error).toContain('Image too blurry');
    });

    it('should reject non-document image', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/non-document.jpg')
      );

      mockSendRekognition.mockResolvedValueOnce(mockNonDocumentResponse);

      const result = await validateImageQuality(imageBuffer, 'id', config);

      expect(result.isValid).toBe(false);
      expect(result.details?.document?.hasDocument).toBe(false);
      expect(result.error).toContain('No valid document detected');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid image data', async () => {
      const imageBuffer = Buffer.from('invalid image data');

      const result = await validateImageQuality(imageBuffer, 'selfie', config);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle AWS service errors', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/valid-selfie.jpg')
      );

      mockSendRekognition.mockRejectedValueOnce(new Error('AWS Service Error'));

      const result = await validateImageQuality(imageBuffer, 'selfie', config);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
