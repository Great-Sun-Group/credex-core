import { 
  RekognitionClient, 
  CompareFacesCommand,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  ListCollectionsCommand
} from '@aws-sdk/client-rekognition';
import { FaceComparisonResult } from '../types';
import { auditLogger } from '../../../utils/auditLogger';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });
const SIMILARITY_THRESHOLD = 90;
const COLLECTION_ID = 'credex-faces';

export const initializeCollection = async (): Promise<void> => {
  try {
    const collections = await rekognition.send(new ListCollectionsCommand({}));
    const exists = collections.CollectionIds?.includes(COLLECTION_ID);
    
    if (!exists) {
      await createCollection();
    }
  } catch (error) {
    console.error('Failed to initialize collection:', error);
    throw new Error('Initialization failed');
  }
};

export const createCollection = async (collectionId: string = COLLECTION_ID): Promise<void> => {
  try {
    await rekognition.send(new CreateCollectionCommand({
      CollectionId: collectionId
    }));
  } catch (error) {
    console.error('Failed to create collection:', error);
    throw new Error('Creation failed');
  }
};

export const deleteCollection = async (collectionId: string = COLLECTION_ID): Promise<void> => {
  try {
    await rekognition.send(new DeleteCollectionCommand({
      CollectionId: collectionId
    }));
  } catch (error) {
    console.error('Failed to delete collection:', error);
    throw new Error('Deletion failed');
  }
};

export const compareFaces = async (
  sourceImage: Buffer,
  targetImage: Buffer
): Promise<FaceComparisonResult> => {
  try {
    const response = await rekognition.send(new CompareFacesCommand({
      SourceImage: { Bytes: sourceImage },
      TargetImage: { Bytes: targetImage },
      SimilarityThreshold: SIMILARITY_THRESHOLD
    }));

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
