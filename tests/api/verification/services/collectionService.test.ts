// Mock AWS SDK first
const mockRekognition = {
  createCollection: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  deleteCollection: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  compareFaces: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      FaceMatches: [{
        Similarity: 95.0,
        Face: {
          BoundingBox: {
            Left: 0.1,
            Top: 0.1,
            Width: 0.8,
            Height: 0.8
          },
          Confidence: 99.9
        }
      }]
    })
  })
};

jest.mock('aws-sdk', () => ({
  Rekognition: jest.fn(() => mockRekognition)
}));

import AWS from 'aws-sdk';
import { initializeCollection, createCollection, deleteCollection } from '../../../../src/api/verification/services/collectionService';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock audit logger
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    logVerificationEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Collection Service', () => {
  const TEST_COLLECTION_ID = 'credex-faces-test';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_NAME = 'credex';
    process.env.ENVIRONMENT = 'test';
  });

  describe('initializeCollection', () => {
    it('should successfully initialize collection', async () => {
      await initializeCollection();

      expect(mockRekognition.createCollection).toHaveBeenCalledWith({
        CollectionId: TEST_COLLECTION_ID
      });

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith({
        eventType: 'COLLECTION_INITIALIZED',
        documentType: 'system',
        ipAddress: 'system',
        userAgent: 'system',
        processingResults: {
          qualityChecks: null,
          authenticityChecks: null,
          extractedData: { collectionId: TEST_COLLECTION_ID }
        },
        documentHash: ''
      });
    });

    it('should handle existing collection gracefully', async () => {
      const error = new Error('Collection already exists');
      (error as any).code = 'ResourceAlreadyExistsException';
      
      mockRekognition.createCollection.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(error)
      });

      await initializeCollection();

      expect(auditLogger.logVerificationEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COLLECTION_INITIALIZATION_FAILED'
        })
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      
      mockRekognition.createCollection.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(error)
      });

      await expect(initializeCollection()).rejects.toThrow('Initialization failed');

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith({
        eventType: 'COLLECTION_INITIALIZATION_FAILED',
        documentType: 'system',
        ipAddress: 'system',
        userAgent: 'system',
        processingResults: {
          qualityChecks: null,
          authenticityChecks: null,
          extractedData: { 
            collectionId: TEST_COLLECTION_ID,
            error: 'Initialization failed'
          }
        },
        documentHash: ''
      });
    });
  });

  describe('createCollection', () => {
    it('should create collection successfully', async () => {
      await createCollection(TEST_COLLECTION_ID);

      expect(mockRekognition.createCollection).toHaveBeenCalledWith({
        CollectionId: TEST_COLLECTION_ID
      });
    });

    it('should handle creation errors', async () => {
      mockRekognition.createCollection.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(new Error('Creation failed'))
      });

      await expect(createCollection(TEST_COLLECTION_ID)).rejects.toThrow('Creation failed');
    });
  });

  describe('deleteCollection', () => {
    it('should delete collection successfully', async () => {
      await deleteCollection();

      expect(mockRekognition.deleteCollection).toHaveBeenCalledWith({
        CollectionId: TEST_COLLECTION_ID
      });
    });

    it('should handle deletion errors', async () => {
      mockRekognition.deleteCollection.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(new Error('Deletion failed'))
      });

      await expect(deleteCollection()).rejects.toThrow('Deletion failed');
    });
  });
});
