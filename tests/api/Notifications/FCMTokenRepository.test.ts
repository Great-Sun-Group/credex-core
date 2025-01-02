import { fcmTokenRepository } from '../../../src/api/Notifications/repositories/FCMTokenRepository';
import { ledgerSpaceDriver } from '../../../config/neo4j';
import { logInfo, logError, logWarning, logDebug } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logDebug: jest.fn()
}));

// Mock Neo4j driver
jest.mock('../../../config/neo4j', () => ({
  ledgerSpaceDriver: {
    session: jest.fn(),
    getConfig: jest.fn().mockReturnValue({
      maxConnectionPoolSize: 100,
      connectionAcquisitionTimeout: 5000
    })
  }
}));

describe('FCMTokenRepository', () => {
  let mockSession: any;
  let mockTransaction: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock transaction
    mockTransaction = {
      run: jest.fn()
    };

    // Setup mock session
    mockSession = {
      executeWrite: jest.fn(async (callback) => callback(mockTransaction)),
      executeRead: jest.fn(async (callback) => callback(mockTransaction)),
      close: jest.fn()
    };

    // Setup mock driver session
    (ledgerSpaceDriver.session as jest.Mock).mockReturnValue(mockSession);
  });

  describe('initialization', () => {
    it('should log driver configuration on initialization', () => {
      fcmTokenRepository.getInstance();
      expect(logDebug).toHaveBeenCalledWith('Initializing FCMTokenRepository', {
        driverConfig: {
          maxConnectionPoolSize: 100,
          connectionAcquisitionTimeout: 5000
        }
      });
    });

    it('should reuse existing instance', () => {
      const instance1 = fcmTokenRepository.getInstance();
      const instance2 = fcmTokenRepository.getInstance();
      expect(instance1).toBe(instance2);
      expect(logInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveToken', () => {
    it('should save a new token successfully', async () => {
      const token = {
        token: 'test-fcm-token',
        userId: 'test-user',
        platform: 'android' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock user exists
      mockTransaction.run.mockResolvedValueOnce({ records: [{ get: () => ({}) }] });
      mockTransaction.run.mockResolvedValueOnce({ records: [] }); // Delete old tokens
      mockTransaction.run.mockResolvedValueOnce({ records: [{ get: () => token }] }); // Create new token

      await fcmTokenRepository.saveToken(token);

      // Verify logging
      expect(logDebug).toHaveBeenCalledWith('Entering saveToken', expect.any(Object));
      expect(logDebug).toHaveBeenCalledWith('Starting database transaction');
      expect(logInfo).toHaveBeenCalledWith('Token saved successfully', expect.any(Object));
      expect(logDebug).toHaveBeenCalledWith('Closing database session');

      // Verify session was closed
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle member not found error', async () => {
      const token = {
        token: 'test-fcm-token',
        userId: 'test-user',
        platform: 'android' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock user not found
      mockTransaction.run.mockResolvedValueOnce({ records: [] });

      await expect(fcmTokenRepository.saveToken(token)).rejects.toThrow('Member with ID test-user not found');

      // Verify logging
      expect(logWarning).toHaveBeenCalledWith('Member not found', { userId: 'test-user' });
      expect(logDebug).toHaveBeenCalledWith('Closing database session');
    });

    it('should handle database connection errors', async () => {
      const token = {
        token: 'test-fcm-token',
        userId: 'test-user',
        platform: 'android' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const dbError = new Error('Connection failed');
      mockSession.executeWrite.mockRejectedValueOnce(dbError);

      await expect(fcmTokenRepository.saveToken(token)).rejects.toThrow('Connection failed');

      // Verify error logging
      expect(logError).toHaveBeenCalledWith('Error saving token', dbError);
      expect(logDebug).toHaveBeenCalledWith('Save token context', {
        userId: token.userId,
        platform: token.platform
      });
    });
  });

  describe('getToken', () => {
    it('should retrieve an existing token', async () => {
      const mockToken = {
        token: 'test-fcm-token',
        userId: 'test-user',
        platform: 'android',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockTransaction.run.mockResolvedValueOnce({
        records: [{
          get: (key: string) => ({
            properties: mockToken
          })
        }]
      });

      const result = await fcmTokenRepository.getToken('test-user');

      expect(result).toBeTruthy();
      expect(result?.token).toBe(mockToken.token);
      expect(logDebug).toHaveBeenCalledWith('Token found for user', { userId: 'test-user' });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return null when no token exists', async () => {
      mockTransaction.run.mockResolvedValueOnce({ records: [] });

      const result = await fcmTokenRepository.getToken('test-user');

      expect(result).toBeNull();
      expect(logDebug).toHaveBeenCalledWith('No token found for user', { userId: 'test-user' });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockSession.executeRead.mockRejectedValueOnce(dbError);

      await expect(fcmTokenRepository.getToken('test-user')).rejects.toThrow('Query failed');

      expect(logError).toHaveBeenCalledWith('Error retrieving token', dbError);
      expect(logDebug).toHaveBeenCalledWith('Get token context', { userId: 'test-user' });
    });
  });

  describe('removeToken', () => {
    it('should remove an existing token', async () => {
      mockTransaction.run.mockResolvedValueOnce({ records: [] });

      await fcmTokenRepository.removeToken('test-user', 'test-token');

      expect(logDebug).toHaveBeenCalledWith('Entering removeToken', expect.any(Object));
      expect(logInfo).toHaveBeenCalledWith('Token removed successfully', { userId: 'test-user' });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle removal errors', async () => {
      const dbError = new Error('Removal failed');
      mockSession.executeWrite.mockRejectedValueOnce(dbError);

      await expect(fcmTokenRepository.removeToken('test-user', 'test-token')).rejects.toThrow('Removal failed');

      expect(logError).toHaveBeenCalledWith('Error removing token', dbError);
      expect(logDebug).toHaveBeenCalledWith('Remove token context', { userId: 'test-user' });
    });
  });

  describe('removeAllUserTokens', () => {
    it('should remove all tokens for a user', async () => {
      mockTransaction.run.mockResolvedValueOnce({ records: [] });

      await fcmTokenRepository.removeAllUserTokens('test-user');

      expect(logDebug).toHaveBeenCalledWith('Entering removeAllUserTokens', { userId: 'test-user' });
      expect(logInfo).toHaveBeenCalledWith('All tokens removed for user', { userId: 'test-user' });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle bulk removal errors', async () => {
      const dbError = new Error('Bulk removal failed');
      mockSession.executeWrite.mockRejectedValueOnce(dbError);

      await expect(fcmTokenRepository.removeAllUserTokens('test-user')).rejects.toThrow('Bulk removal failed');

      expect(logError).toHaveBeenCalledWith('Error removing all tokens', dbError);
      expect(logDebug).toHaveBeenCalledWith('Remove all tokens context', { userId: 'test-user' });
    });
  });

  describe('cleanupInvalidTokens', () => {
    it('should remove all invalid tokens', async () => {
      mockTransaction.run.mockResolvedValueOnce({ records: [] });

      await fcmTokenRepository.cleanupInvalidTokens();

      expect(logDebug).toHaveBeenCalledWith('Entering cleanupInvalidTokens');
      expect(logInfo).toHaveBeenCalledWith('Invalid tokens cleaned up');
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      const dbError = new Error('Cleanup failed');
      mockSession.executeWrite.mockRejectedValueOnce(dbError);

      await expect(fcmTokenRepository.cleanupInvalidTokens()).rejects.toThrow('Cleanup failed');

      expect(logError).toHaveBeenCalledWith('Error cleaning up invalid tokens', dbError);
      expect(logDebug).toHaveBeenCalledWith('Cleanup context', { operation: 'cleanupInvalidTokens' });
    });
  });
});
