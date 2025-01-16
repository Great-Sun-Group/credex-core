import { validateImage } from './imageQualityService';
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { FaceComparisonResult } from '../types';
import { ImageQualityConfig } from '../types';
import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import { MetricsService } from './metrics';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });
const SIMILARITY_THRESHOLD = 90;

const DEFAULT_CONFIG: ImageQualityConfig = {
  minWidth: 640,
  minHeight: 480,
  blurThreshold: 0.3,
  minBrightness: 0.2,
  maxBrightness: 0.8,
  faceConfidenceThreshold: 90,
  documentConfidenceThreshold: 90
};

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

const getCacheKey = (source: Buffer, target: Buffer): string => {
  const sourceHash = createHash('sha256').update(source).digest('hex');
  const targetHash = createHash('sha256').update(target).digest('hex');
  return `face_comparison:${sourceHash}:${targetHash}`;
};

const processComparisonResult = (response: any): FaceComparisonResult => {
  const match = response.FaceMatches?.[0];
  
  if (!match) {
    return {
      similarity: 0,
      verified: false,
      confidence: 0
    };
  }

  return {
    similarity: match.Similarity || 0,
    verified: (match.Similarity || 0) >= SIMILARITY_THRESHOLD,
    confidence: match.Face?.Confidence || 0,
    boundingBox: match.Face?.BoundingBox ? {
      left: match.Face.BoundingBox.Left || 0,
      top: match.Face.BoundingBox.Top || 0,
      width: match.Face.BoundingBox.Width || 0,
      height: match.Face.BoundingBox.Height || 0
    } : undefined
  };
};

const validateFaceCount = (response: any): void => {
  const sourceFaces = response.SourceImageFace ? 1 : 0;
  const targetFaces = response.UnmatchedFaces?.length || 0;
  
  if (sourceFaces === 0) {
    throw new Error('No face detected in source image');
  }
  
  if (sourceFaces + targetFaces > 1) {
    throw new Error('Multiple faces detected in images');
  }
};

const recordMetrics = async (
  result: FaceComparisonResult,
  startTime: number
): Promise<void> => {
  const duration = Date.now() - startTime;
  
  await Promise.all([
    MetricsService.record({
      metricName: 'FaceComparison.Duration',
      dimensions: { Result: result.verified ? 'Success' : 'Failed' },
      value: duration
    }),
    MetricsService.record({
      metricName: 'FaceComparison.Similarity',
      dimensions: { Result: result.verified ? 'Success' : 'Failed' },
      value: result.similarity
    })
  ]);
};

export const compareFaces = async (
  sourceImage: Buffer,
  targetImage: Buffer
): Promise<FaceComparisonResult> => {
  const startTime = Date.now();
  const cacheKey = getCacheKey(sourceImage, targetImage);
  const cached = cache.get<FaceComparisonResult>(cacheKey);
  
  if (cached) {
    await recordMetrics(cached, startTime);
    return cached;
  }

  try {
    const [sourceQuality, targetQuality] = await Promise.all([
      validateImage(sourceImage, 'selfie', DEFAULT_CONFIG),
      validateImage(targetImage, 'id', DEFAULT_CONFIG)
    ]);

    if (!sourceQuality.isValid || !targetQuality.isValid) {
      throw new Error('Image quality requirements not met');
    }

    const command = new CompareFacesCommand({
      SourceImage: { Bytes: sourceImage },
      TargetImage: { Bytes: targetImage },
      SimilarityThreshold: SIMILARITY_THRESHOLD,
      QualityFilter: 'HIGH'
    });
    const response = await rekognition.send(command);

    validateFaceCount(response);

    const result = processComparisonResult(response);
    cache.set(cacheKey, result);
    await recordMetrics(result, startTime);
    return result;
  } catch (error) {
    console.error('Face comparison error:', error);
    if (error instanceof Error) {
      if (error.message === 'Image quality requirements not met') {
        throw error;
      }
      if (error.message === 'No face detected in source image' || 
          error.message === 'Multiple faces detected in images') {
        throw error;
      }
    }
    throw new Error('Failed to compare faces');
  }
};
