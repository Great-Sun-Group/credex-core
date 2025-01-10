import { processVerification } from '../../../../src/api/verification/services/fraudDetection';
import { FraudDetection } from '../../../../src/api/verification/types/fraudDetection';
import { MetricsService } from '../../../../src/api/verification/services/metrics';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({
    send: jest.fn()
  })),
  PutItemCommand: jest.fn(),
  QueryCommand: jest.fn(),
  GetItemCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn(() => ({
    send: jest.fn()
  })),
  PublishCommand: jest.fn()
}));

// Mock metrics and audit logger
jest.mock('../../../../src/api/verification/services/metrics');
jest.mock('../../../../src/utils/auditLogger');

describe('Fraud Detection Service', () => {
  const mockVerificationParams: FraudDetection.VerificationParams = {
    userId: 'user123',
    idNumber: 'ID123',
    similarity: 95,
    deviceInfo: {
      deviceId: 'device123',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1'
    },
    location: {
      country: 'US',
      city: 'New York'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('processes verification without suspicious activity', async () => {
    // Mock DynamoDB responses
    const mockDynamoDB = require('@aws-sdk/client-dynamodb');
    mockDynamoDB.QueryCommand.mockImplementation(() => ({
      Items: [] // No previous attempts
    }));
    mockDynamoDB.GetItemCommand.mockImplementation(() => ({
      Item: null // Not blacklisted
    }));

    const result = await processVerification(mockVerificationParams);

    expect(result.allowed).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(MetricsService.incrementCounter).not.toHaveBeenCalled();
  });

  test('detects suspicious similarity score', async () => {
    const params = { ...mockVerificationParams, similarity: 91 };

    const result = await processVerification(params);

    expect(result.allowed).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: 'similarity',
        suspicious: true,
        score: 91
      })
    );
    expect(MetricsService.incrementCounter).toHaveBeenCalledWith('BorderlineSimilarityScore');
  });

  test('identifies multiple attempts', async () => {
    const mockDynamoDB = require('@aws-sdk/client-dynamodb');
    mockDynamoDB.QueryCommand.mockImplementation(() => ({
      Items: [
        { id: { S: '1' }, timestamp: { S: new Date().toISOString() } },
        { id: { S: '2' }, timestamp: { S: new Date().toISOString() } },
        { id: { S: '3' }, timestamp: { S: new Date().toISOString() } }
      ]
    }));

    const result = await processVerification(mockVerificationParams);

    expect(result.allowed).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: 'attempts',
        suspicious: true,
        count: 3
      })
    );
    expect(MetricsService.incrementCounter).toHaveBeenCalledWith('MultipleAttempts');
  });

  test('recognizes suspicious time patterns', async () => {
    // Mock current time to be 3 AM
    const mockDate = new Date();
    mockDate.setHours(3);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const result = await processVerification(mockVerificationParams);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: 'time',
        suspicious: true,
        hour: 3
      })
    );
    expect(MetricsService.incrementCounter).toHaveBeenCalledWith('SuspiciousTimeAttempt');
  });

  test('handles blacklisted IDs', async () => {
    const mockDynamoDB = require('@aws-sdk/client-dynamodb');
    mockDynamoDB.GetItemCommand.mockImplementation(() => ({
      Item: { id: { S: 'ID123' } } // Blacklisted
    }));

    const result = await processVerification(mockVerificationParams);

    expect(result.allowed).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: 'blacklist',
        suspicious: true
      })
    );
  });

  test('generates alerts for suspicious activity', async () => {
    const mockSNS = require('@aws-sdk/client-sns');
    const mockDynamoDB = require('@aws-sdk/client-dynamodb');
    mockDynamoDB.QueryCommand.mockImplementation(() => ({
      Items: [
        { id: { S: '1' }, timestamp: { S: new Date().toISOString() } },
        { id: { S: '2' }, timestamp: { S: new Date().toISOString() } },
        { id: { S: '3' }, timestamp: { S: new Date().toISOString() } }
      ]
    }));

    await processVerification(mockVerificationParams);

    expect(mockSNS.PublishCommand).toHaveBeenCalled();
    expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SUSPICIOUS_VERIFICATION',
        reason: 'FRAUD_DETECTION'
      })
    );
  });

  test('handles errors gracefully', async () => {
    const mockDynamoDB = require('@aws-sdk/client-dynamodb');
    mockDynamoDB.PutItemCommand.mockImplementation(() => {
      throw new Error('DynamoDB error');
    });

    await expect(processVerification(mockVerificationParams))
      .rejects
      .toThrow('Failed to process fraud detection');
  });
}); 