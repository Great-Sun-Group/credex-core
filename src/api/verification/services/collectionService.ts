import AWS from 'aws-sdk';
import { auditLogger } from '../../../utils/auditLogger';
import { CollectionServiceConfig, FaceComparisonResult } from '../types';
import { getConfig as getAppConfig } from '../../../../config/config';

const rekognition = new AWS.Rekognition();
const SIMILARITY_THRESHOLD = 90; // 90% similarity threshold as specified

let COLLECTION_ID: string;

const initializeCollectionId = async () => {
  const config = await getAppConfig();
  COLLECTION_ID = `credex-faces-${config.environment}`;
  return COLLECTION_ID;
};

export const initializeCollection = async (): Promise<void> => {
  try {
    const collectionId = await initializeCollectionId();
    await createCollection(collectionId);
    await auditLogger.logVerificationEvent({
      eventType: 'COLLECTION_INITIALIZED',
      documentType: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      processingResults: {
        qualityChecks: null,
        authenticityChecks: null,
        extractedData: { collectionId }
      },
      documentHash: ''
    });
  } catch (error: any) {
    if (error.code !== 'ResourceAlreadyExistsException') {
      await auditLogger.logVerificationEvent({
        eventType: 'COLLECTION_INITIALIZATION_FAILED',
        documentType: 'system',
        ipAddress: 'system',
        userAgent: 'system',
        processingResults: {
          qualityChecks: null,
          authenticityChecks: null,
          extractedData: { 
            collectionId: COLLECTION_ID,
            error: error.message 
          }
        },
        documentHash: ''
      });
      throw error;
    }
  }
};

export const createCollection = async (collectionId: string): Promise<void> => {
  await rekognition.createCollection({
    CollectionId: collectionId
  }).promise();
};

export const deleteCollection = async (): Promise<void> => {
  const collectionId = await initializeCollectionId();
  await rekognition.deleteCollection({
    CollectionId: collectionId
  }).promise();
};

export const compareFaces = async (
  sourceImageBuffer: Buffer, 
  targetImageBuffer: Buffer
): Promise<FaceComparisonResult> => {
  try {
    const startTime = Date.now();
    const collectionId = await initializeCollectionId();

    const comparisonResult = await rekognition.compareFaces({
      SourceImage: { Bytes: sourceImageBuffer },
      TargetImage: { Bytes: targetImageBuffer },
      SimilarityThreshold: SIMILARITY_THRESHOLD
    }).promise();

    const processingTime = Date.now() - startTime;

    if (!comparisonResult.FaceMatches || comparisonResult.FaceMatches.length === 0) {
      await auditLogger.logVerificationEvent({
        eventType: 'FACE_COMPARISON_NO_MATCH',
        documentType: 'face',
        ipAddress: 'system',
        userAgent: 'system',
        processingResults: {
          qualityChecks: { processingTime },
          authenticityChecks: null,
          extractedData: null
        },
        documentHash: ''
      });

      return {
        similarity: 0,
        verified: false,
        confidence: 0
      };
    }

    const bestMatch = comparisonResult.FaceMatches[0];
    const result: FaceComparisonResult = {
      similarity: bestMatch.Similarity || 0,
      verified: (bestMatch.Similarity || 0) >= SIMILARITY_THRESHOLD,
      confidence: bestMatch.Face?.Confidence || 0
    };

    if (bestMatch.Face?.BoundingBox) {
      result.boundingBox = {
        left: bestMatch.Face.BoundingBox.Left || 0,
        top: bestMatch.Face.BoundingBox.Top || 0,
        width: bestMatch.Face.BoundingBox.Width || 0,
        height: bestMatch.Face.BoundingBox.Height || 0
      };
    }

    // Log metrics
    await auditLogger.logVerificationEvent({
      eventType: 'FACE_COMPARISON_COMPLETED',
      documentType: 'face',
      ipAddress: 'system',
      userAgent: 'system',
      processingResults: {
        qualityChecks: { processingTime },
        authenticityChecks: null,
        extractedData: {
          similarity: result.similarity,
          verified: result.verified,
          boundingBox: result.boundingBox
        }
      },
      documentHash: ''
    });

    return result;
  } catch (error: any) {
    await auditLogger.logVerificationEvent({
      eventType: 'FACE_COMPARISON_FAILED',
      documentType: 'face',
      ipAddress: 'system',
      userAgent: 'system',
      processingResults: {
        qualityChecks: null,
        authenticityChecks: null,
        extractedData: { error: error.message }
      },
      documentHash: ''
    });
    throw error;
  }
};

export const getCollectionConfig = async (): Promise<CollectionServiceConfig> => {
  const config = await getAppConfig();
  return {
    collectionId: `credex-faces-${config.environment}`,
    similarityThreshold: SIMILARITY_THRESHOLD,
    environment: config.environment,
    appName: 'credex'
  };
};
