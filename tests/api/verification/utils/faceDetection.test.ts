import { detectFace, validateFacePosition } from '../../../../src/api/verification/utils/faceDetection';
import { FaceLocation } from '../../../../src/api/verification/types';
import { auditLogger } from '../../../../src/utils/auditLogger';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock opencv4nodejs
jest.mock('opencv4nodejs', () => {
  const mockDetectMultiScaleAsync = jest.fn();
  const mockCvtColor = jest.fn();
  const mockGetRegion = jest.fn();
  const mockCalcHist = jest.fn();
  const mockConvertTo = jest.fn();
  const mockNormalize = jest.fn();

  return {
    imdecodeAsync: jest.fn().mockResolvedValue({
      cvtColor: mockCvtColor,
      cols: 1024,
      rows: 768
    }),
    CascadeClassifier: jest.fn().mockImplementation(() => ({
      detectMultiScaleAsync: mockDetectMultiScaleAsync
    })),
    COLOR_BGR2GRAY: 'COLOR_BGR2GRAY',
    CV_32F: 'CV_32F',
    NORM_MINMAX: 'NORM_MINMAX',
    Rect: jest.fn(),
    Mat: jest.fn().mockImplementation(() => ({
      getRegion: mockGetRegion,
      calcHist: mockCalcHist,
      convertTo: mockConvertTo,
      normalize: mockNormalize,
      at: jest.fn().mockReturnValue(0.5),
      rows: 256
    }))
  };
});

describe('Face Detection', () => {
  const mockImageBuffer = Buffer.from('test-image');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectFace', () => {
    it('should detect a single face successfully', async () => {
      const mockFace = { x: 100, y: 100, width: 200, height: 200 };
      const cv = require('opencv4nodejs');
      cv.CascadeClassifier.mockImplementation(() => ({
        detectMultiScaleAsync: jest.fn().mockResolvedValue([mockFace])
      }));

      const result = await detectFace(mockImageBuffer);

      expect(result.hasFace).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.faceLocation).toEqual(mockFace);
      expect(result.error).toBeUndefined();
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle no faces detected', async () => {
      const cv = require('opencv4nodejs');
      cv.CascadeClassifier.mockImplementation(() => ({
        detectMultiScaleAsync: jest.fn().mockResolvedValue([])
      }));

      const result = await detectFace(mockImageBuffer);

      expect(result.hasFace).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('No face detected in image');
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle multiple faces detected', async () => {
      const cv = require('opencv4nodejs');
      cv.CascadeClassifier.mockImplementation(() => ({
        detectMultiScaleAsync: jest.fn().mockResolvedValue([
          { x: 100, y: 100, width: 200, height: 200 },
          { x: 300, y: 300, width: 200, height: 200 }
        ])
      }));

      const result = await detectFace(mockImageBuffer);

      expect(result.hasFace).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Multiple faces detected in image');
      expect(auditLogger.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const cv = require('opencv4nodejs');
      cv.CascadeClassifier.mockImplementation(() => ({
        detectMultiScaleAsync: jest.fn().mockRejectedValue(new Error('Detection failed'))
      }));

      const result = await detectFace(mockImageBuffer);

      expect(result.hasFace).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Face detection failed: Detection failed');
      expect(auditLogger.log).toHaveBeenCalled();
    });
  });

  describe('validateFacePosition', () => {
    it('should validate well-centered face', async () => {
      const faceLocation: FaceLocation = {
        x: 412, // centered in 1024px width
        y: 284, // centered in 768px height
        width: 200,
        height: 200
      };

      const result = await validateFacePosition(faceLocation);

      expect(result).toBe(true);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('should reject off-center face', async () => {
      const faceLocation: FaceLocation = {
        x: 0, // too far left
        y: 0, // too far up
        width: 200,
        height: 200
      };

      const result = await validateFacePosition(faceLocation);

      expect(result).toBe(false);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('should reject face too small', async () => {
      const faceLocation: FaceLocation = {
        x: 412,
        y: 284,
        width: 50, // too small
        height: 50 // too small
      };

      const result = await validateFacePosition(faceLocation);

      expect(result).toBe(false);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('should reject face too large', async () => {
      const faceLocation: FaceLocation = {
        x: 412,
        y: 284,
        width: 1000, // too large
        height: 1000 // too large
      };

      const result = await validateFacePosition(faceLocation);

      expect(result).toBe(false);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const result = await validateFacePosition({
        x: NaN,
        y: NaN,
        width: NaN,
        height: NaN
      });

      expect(result).toBe(false);
      expect(auditLogger.log).toHaveBeenCalled();
    });
  });
});
