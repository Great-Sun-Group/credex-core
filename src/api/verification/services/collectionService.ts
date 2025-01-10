import { Rekognition } from 'aws-sdk';
import { FaceComparisonResult } from '../types';
import { auditLogger } from '../../../utils/auditLogger';

const rekognition = new Rekognition();
const SIMILARITY_THRESHOLD = 90;

export const compareFaces = async (
  sourceImage: Buffer,
  targetImage: Buffer
): Promise<FaceComparisonResult> => {
  try {
    const response = await rekognition.compareFaces({
      SourceImage: { Bytes: sourceImage },
      TargetImage: { Bytes: targetImage },
      SimilarityThreshold: SIMILARITY_THRESHOLD
    }).promise();

    const match = response.FaceMatches?.[0];
    
    return {
      similarity: match?.Similarity || 0,
      verified: (match?.Similarity || 0) >= SIMILARITY_THRESHOLD,
      confidence: match?.Face?.Confidence || 0,
      boundingBox: match?.Face?.BoundingBox ? {
        left: match.Face.BoundingBox.Left || 0,
        top: match.Face.BoundingBox.Top || 0,
        width: match.Face.BoundingBox.Width || 0,
        height: match.Face.BoundingBox.Height || 0
      } : undefined
    };
  } catch (error) {
    await logVerificationError(error);
    throw error;
  }
};

const logVerificationError = async (error: unknown) => {
  await auditLogger.logVerificationEvent({
    eventType: 'FACE_COMPARISON_ERROR',
    documentType: 'face',
    ipAddress: 'system',
    userAgent: 'system',
    processingResults: {
      qualityChecks: null,
      authenticityChecks: null,
      extractedData: { error: error instanceof Error ? error.message : 'Unknown error' }
    },
    documentHash: ''
  });
};
