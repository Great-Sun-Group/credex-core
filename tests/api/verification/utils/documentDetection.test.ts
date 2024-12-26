import { detectDocumentEdges, validateDocumentAlignment } from '../../../../src/api/verification/utils/documentDetection';
import { Corner } from '../../../../src/api/verification/types';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock dependencies
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock opencv4nodejs
jest.mock('opencv4nodejs', () => {
  const mockFindContours = jest.fn();
  const mockCvtColor = jest.fn();
  const mockGaussianBlur = jest.fn();
  const mockCanny = jest.fn();
  const mockDilate = jest.fn();
  const mockArcLength = jest.fn();
  const mockApproxPolyDP = jest.fn();
  const mockArea = jest.fn();
  const mockConvexHull = jest.fn();

  return {
    imdecodeAsync: jest.fn().mockResolvedValue({
      cvtColor: mockCvtColor,
      gaussianBlur: mockGaussianBlur,
      canny: mockCanny,
      dilate: mockDilate,
      findContours: mockFindContours,
      cols: 1024,
      rows: 768,
      size: { width: 1024, height: 768 }
    }),
    COLOR_BGR2GRAY: 'COLOR_BGR2GRAY',
    RETR_EXTERNAL: 'RETR_EXTERNAL',
    CHAIN_APPROX_SIMPLE: 'CHAIN_APPROX_SIMPLE',
    MORPH_RECT: 'MORPH_RECT',
    Size: jest.fn(),
    getStructuringElement: jest.fn().mockReturnValue({}),
    Contour: jest.fn().mockImplementation(() => ({
      arcLength: mockArcLength,
      approxPolyDP: mockApproxPolyDP,
      area: mockArea,
      convexHull: mockConvexHull
    }))
  };
});

describe('Document Detection', () => {
  const mockImageBuffer = Buffer.from('test-image');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectDocumentEdges', () => {
    it('should detect document edges successfully', async () => {
      const mockCorners = [
        { x: 100, y: 100 },
        { x: 924, y: 100 },
        { x: 924, y: 668 },
        { x: 100, y: 668 }
      ];

      const cv = require('opencv4nodejs');
      const mockContour = {
        arcLength: jest.fn().mockReturnValue(3000),
        approxPolyDP: jest.fn().mockReturnValue(mockCorners),
        area: 500000,
        convexHull: jest.fn().mockReturnValue({ area: 510000 })
      };

      cv.imdecodeAsync.mockImplementation(() => ({
        cvtColor: jest.fn().mockReturnThis(),
        gaussianBlur: jest.fn().mockReturnThis(),
        canny: jest.fn().mockReturnThis(),
        dilate: jest.fn().mockReturnThis(),
        findContours: jest.fn().mockReturnValue([mockContour]),
        cols: 1024,
        rows: 768,
        size: { width: 1024, height: 768 }
      }));

      const result = await detectDocumentEdges(mockImageBuffer);

      expect(result.hasDocument).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.corners).toHaveLength(4);
      expect(result.error).toBeUndefined();
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle no document detected', async () => {
      const cv = require('opencv4nodejs');
      cv.imdecodeAsync.mockImplementation(() => ({
        cvtColor: jest.fn().mockReturnThis(),
        gaussianBlur: jest.fn().mockReturnThis(),
        canny: jest.fn().mockReturnThis(),
        dilate: jest.fn().mockReturnThis(),
        findContours: jest.fn().mockReturnValue([]),
        cols: 1024,
        rows: 768,
        size: { width: 1024, height: 768 }
      }));

      const result = await detectDocumentEdges(mockImageBuffer);

      expect(result.hasDocument).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('No document boundaries detected');
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle non-rectangular shape', async () => {
      const cv = require('opencv4nodejs');
      const mockContour = {
        arcLength: jest.fn().mockReturnValue(3000),
        approxPolyDP: jest.fn().mockReturnValue([
          { x: 100, y: 100 },
          { x: 924, y: 100 },
          { x: 924, y: 668 }
        ]), // Only 3 corners
        area: 500000,
        convexHull: jest.fn().mockReturnValue({ area: 510000 })
      };

      cv.imdecodeAsync.mockImplementation(() => ({
        cvtColor: jest.fn().mockReturnThis(),
        gaussianBlur: jest.fn().mockReturnThis(),
        canny: jest.fn().mockReturnThis(),
        dilate: jest.fn().mockReturnThis(),
        findContours: jest.fn().mockReturnValue([mockContour]),
        cols: 1024,
        rows: 768,
        size: { width: 1024, height: 768 }
      }));

      const result = await detectDocumentEdges(mockImageBuffer);

      expect(result.hasDocument).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Document shape is not rectangular');
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const cv = require('opencv4nodejs');
      cv.imdecodeAsync.mockRejectedValue(new Error('Processing failed'));

      const result = await detectDocumentEdges(mockImageBuffer);

      expect(result.hasDocument).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Document detection failed: Processing failed');
      expect(auditLogger.log).toHaveBeenCalled();
    });
  });

  describe('validateDocumentAlignment', () => {
    it('should validate well-aligned document', async () => {
      const corners: Corner[] = [
        { x: 100, y: 100 },
        { x: 924, y: 100 },
        { x: 924, y: 668 },
        { x: 100, y: 668 }
      ];

      const result = await validateDocumentAlignment(corners);

      expect(result).toBe(true);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('should reject document with wrong number of corners', async () => {
      const corners: Corner[] = [
        { x: 100, y: 100 },
        { x: 924, y: 100 },
        { x: 924, y: 668 }
      ];

      const result = await validateDocumentAlignment(corners);

      expect(result).toBe(false);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('should reject skewed document', async () => {
      const corners: Corner[] = [
        { x: 100, y: 100 },
        { x: 924, y: 200 }, // Skewed top edge
        { x: 824, y: 668 },
        { x: 0, y: 568 }
      ];

      const result = await validateDocumentAlignment(corners);

      expect(result).toBe(false);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const result = await validateDocumentAlignment([
        { x: NaN, y: NaN },
        { x: NaN, y: NaN },
        { x: NaN, y: NaN },
        { x: NaN, y: NaN }
      ]);

      expect(result).toBe(false);
      expect(auditLogger.log).toHaveBeenCalled();
    });
  });
});
