import { inferDocumentType } from '../../../../src/api/verification/utils/documentProcessing';

// Mock AWS Rekognition
jest.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      const imageBytes = command.input.Image.Bytes.toString();
      let labels = [];
      
      if (imageBytes.includes('license')) {
        labels = [{ Name: 'Drivers License', Confidence: 95.5 }];
      } else if (imageBytes.includes('passport')) {
        labels = [{ Name: 'Passport', Confidence: 95.5 }];
      } else {
        labels = [{ Name: 'ID Card', Confidence: 95.5 }];
      }

      return Promise.resolve({ Labels: labels });
    })
  })),
  DetectLabelsCommand: jest.fn().mockImplementation((input) => ({
    input
  }))
}));

describe('Document Processing Utils', () => {
  describe('inferDocumentType', () => {
    test('detects drivers license', async () => {
      const mockBuffer = Buffer.from('mock drivers license image');
      const type = await inferDocumentType(mockBuffer);
      expect(type).toBe('DRIVERS_LICENSE');
    });

    test('detects passport', async () => {
      const mockBuffer = Buffer.from('mock passport image');
      const type = await inferDocumentType(mockBuffer);
      expect(type).toBe('PASSPORT');
    });

    test('defaults to national ID for unclear documents', async () => {
      const mockBuffer = Buffer.from('mock unclear document image');
      const type = await inferDocumentType(mockBuffer);
      expect(type).toBe('NATIONAL_ID');
    });
  });
});
