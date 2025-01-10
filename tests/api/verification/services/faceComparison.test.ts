import { compareFaces } from '../../../../src/api/verification/services/faceComparison';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('aws-sdk', () => ({
  Rekognition: jest.fn(() => ({
    compareFaces: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        FaceMatches: [{
          Similarity: 98.5,
          Face: {
            BoundingBox: {
              Width: 0.8,
              Height: 0.8,
              Left: 0.1,
              Top: 0.1
            },
            Confidence: 99.9
          }
        }],
        SourceImageFace: {
          BoundingBox: {
            Width: 0.8,
            Height: 0.8,
            Left: 0.1,
            Top: 0.1
          },
          Confidence: 99.9
        }
      })
    })
  }))
}));

describe('Face Comparison', () => {
  test('compares matching faces successfully', async () => {
    const selfie = readFileSync(join(__dirname, '../../../fixtures/verification/valid-selfie.jpg'));
    const idPhoto = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
    
    const result = await compareFaces(selfie, idPhoto);
    
    expect(result.similarity).toBeGreaterThanOrEqual(90);
    expect(result.verified).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(90);
    expect(result.boundingBox).toBeDefined();
  });

  test('handles non-matching faces', async () => {
    const AWS = require('aws-sdk');
    AWS.Rekognition.mockImplementationOnce(() => ({
      compareFaces: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          FaceMatches: [{
            Similarity: 85.5,
            Face: {
              BoundingBox: {
                Width: 0.8,
                Height: 0.8,
                Left: 0.1,
                Top: 0.1
              },
              Confidence: 99.9
            }
          }]
        })
      })
    }));

    const selfie = readFileSync(join(__dirname, '../../../fixtures/verification/valid-selfie.jpg'));
    const idPhoto = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
    
    const result = await compareFaces(selfie, idPhoto);
    
    expect(result.similarity).toBeLessThan(90);
    expect(result.verified).toBe(false);
  });

  test('handles quality validation failures', async () => {
    const blurrySelfie = readFileSync(join(__dirname, '../../../fixtures/verification/blurry-selfie.jpg'));
    const idPhoto = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
    
    await expect(compareFaces(blurrySelfie, idPhoto))
      .rejects
      .toThrow('Image quality requirements not met');
  });

  test('rejects multiple faces in source image', async () => {
    const AWS = require('aws-sdk');
    AWS.Rekognition.mockImplementationOnce(() => ({
      compareFaces: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          FaceMatches: [{
            Similarity: 98.5,
            Face: { Confidence: 99.9 }
          }],
          UnmatchedFaces: [{
            BoundingBox: {},
            Confidence: 99.9
          }],
          SourceImageFace: {
            BoundingBox: {},
            Confidence: 99.9
          }
        })
      })
    }));

    const selfie = readFileSync(join(__dirname, '../../../fixtures/verification/multiple-faces.jpg'));
    const idPhoto = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
    
    await expect(compareFaces(selfie, idPhoto))
      .rejects
      .toThrow('Multiple faces detected in images');
  });

  test('uses cache for repeated comparisons', async () => {
    const AWS = require('aws-sdk');
    const compareFacesSpy = jest.spyOn(AWS.Rekognition.prototype, 'compareFaces');

    const selfie = readFileSync(join(__dirname, '../../../fixtures/verification/valid-selfie.jpg'));
    const idPhoto = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
    
    // First call should hit AWS
    const result1 = await compareFaces(selfie, idPhoto);
    expect(compareFacesSpy).toHaveBeenCalledTimes(1);
    
    // Second call should use cache
    const result2 = await compareFaces(selfie, idPhoto);
    expect(compareFacesSpy).toHaveBeenCalledTimes(1);
    
    expect(result1).toEqual(result2);
  });

  test('handles face detection errors gracefully', async () => {
    const AWS = require('aws-sdk');
    AWS.Rekognition.mockImplementationOnce(() => ({
      compareFaces: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          FaceMatches: [],
          SourceImageFace: null
        })
      })
    }));

    const selfie = readFileSync(join(__dirname, '../../../fixtures/verification/no-face.jpg'));
    const idPhoto = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
    
    await expect(compareFaces(selfie, idPhoto))
      .rejects
      .toThrow('No face detected in source image');
  });
}); 