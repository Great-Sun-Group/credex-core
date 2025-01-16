// Mock AWS SDK v3 services and enums
import { jest } from '@jest/globals';

// Mock AWS SDK enums
export const Textract = {
  FORMS: 'FORMS',
  TABLES: 'TABLES'
};

export const Rekognition = {
  AUTO: 'AUTO',
  GENERAL_LABELS: 'GENERAL_LABELS',
  LABELS: 'LABELS',
  MODERATION_LABELS: 'MODERATION_LABELS'
};

// Type definitions for mock responses
type MockResponse<T> = Promise<T>;

// Mock AWS SDK clients
export const mockS3Send = jest.fn().mockImplementation((): MockResponse<any> => Promise.resolve({}));
export const mockTextractSend = jest.fn().mockImplementation((): MockResponse<any> => Promise.resolve({ 
  Blocks: [{ 
    BlockType: 'LINE',
    Text: 'Sample Text',
    Confidence: 99.9
  }]
}));

export const mockRekognitionSend = jest.fn().mockImplementation((command: any): MockResponse<any> => {
  // Mock face detection for quality checks
  if (command instanceof DetectFacesCommand) {
    const imageBuffer = command.input.Image.Bytes;
    if (imageBuffer.includes('blurry') || imageBuffer.includes('dark')) {
      return Promise.resolve({
        FaceDetails: [{
          Confidence: 60,
          Quality: { Brightness: 20, Sharpness: 20 }
        }]
      });
    }
    if (imageBuffer.includes('no-face')) {
      return Promise.resolve({ FaceDetails: [] });
    }
    if (imageBuffer.includes('multiple-faces')) {
      return Promise.resolve({
        FaceDetails: [
          { Confidence: 99, Quality: { Brightness: 80, Sharpness: 80 } },
          { Confidence: 99, Quality: { Brightness: 80, Sharpness: 80 } }
        ]
      });
    }
    return Promise.resolve({
      FaceDetails: [{
        Confidence: 99,
        Quality: { Brightness: 80, Sharpness: 80 }
      }]
    });
  }

  // Mock face comparison
  if (command instanceof CompareFacesCommand) {
    const sourceBuffer = command.input.SourceImage.Bytes;
    if (sourceBuffer.includes('blurry') || sourceBuffer.includes('dark')) {
      return Promise.resolve({
        FaceMatches: [],
        SourceImageFace: null
      });
    }
    if (sourceBuffer.includes('no-face')) {
      return Promise.resolve({
        FaceMatches: [],
        SourceImageFace: null
      });
    }
    if (sourceBuffer.includes('multiple-faces')) {
      return Promise.resolve({
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
      });
    }
    return Promise.resolve({
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
    });
  }

  // Mock collection operations
  if (command instanceof ListCollectionsCommand) {
    return Promise.resolve({
      CollectionIds: ['credex-faces']
    });
  }

  // Mock label detection for document verification
  if (command instanceof DetectLabelsCommand) {
    const imageBuffer = command.input.Image.Bytes;
    if (imageBuffer.includes('tampered')) {
      return Promise.resolve({
        Labels: []
      });
    }
    return Promise.resolve({
      Labels: [{
        Name: 'ID Card',
        Confidence: 99.9
      }, {
        Name: 'Hologram',
        Confidence: 95.0
      }]
    });
  }

  return Promise.resolve({});
});

// Mock DynamoDB
export const mockDynamoDBSend = jest.fn().mockImplementation((): MockResponse<any> => Promise.resolve({}));

export const DynamoDBClient = jest.fn().mockImplementation((config) => ({
  config,
  send: mockDynamoDBSend
}));

export const DynamoDBDocumentClient = {
  from: jest.fn().mockReturnValue({
    send: mockDynamoDBSend
  })
};

// Mock S3
export const S3Client = jest.fn().mockImplementation((config) => ({
  config,
  send: mockS3Send
}));

// Mock Textract
export const TextractClient = jest.fn().mockImplementation((config) => ({
  config,
  send: mockTextractSend
}));

// Mock Rekognition
export const RekognitionClient = jest.fn().mockImplementation((config) => ({
  config,
  send: mockRekognitionSend
}));

// Mock SNS
export const SNSClient = jest.fn().mockImplementation((config) => ({
  config,
  send: jest.fn().mockImplementation((): MockResponse<any> => Promise.resolve({}))
}));

// Commands
export class PutObjectCommand {
  constructor(public readonly input: any) {}
}

export class AnalyzeDocumentCommand {
  constructor(public readonly input: any) {}
}

export class DetectDocumentTextCommand {
  constructor(public readonly input: any) {}
}

export class CompareFacesCommand {
  constructor(public readonly input: any) {}
}

export class DetectFacesCommand {
  constructor(public readonly input: any) {}
}

export class DetectLabelsCommand {
  constructor(public readonly input: any) {}
}

export class ListCollectionsCommand {
  constructor(public readonly input: any) {}
}

export class CreateCollectionCommand {
  constructor(public readonly input: any) {}
}

export class DeleteCollectionCommand {
  constructor(public readonly input: any) {}
}

// Reset all mocks
export const resetAwsMocks = () => {
  mockS3Send.mockClear();
  mockTextractSend.mockClear();
  mockRekognitionSend.mockClear();
  mockDynamoDBSend.mockClear();
  jest.clearAllMocks();
};
