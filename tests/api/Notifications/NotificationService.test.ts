import { NotificationService } from '../../../src/api/Notifications/NotificationService';
import { fcmTokenRepository } from '../../../src/api/Notifications/repositories/FCMTokenRepository';
import * as admin from 'firebase-admin';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  messaging: jest.fn(() => ({
    send: jest.fn()
  }))
}));

// Mock FCM Token Repository
jest.mock('../../../src/api/Notifications/repositories/FCMTokenRepository', () => ({
  fcmTokenRepository: {
    getToken: jest.fn(),
    saveToken: jest.fn(),
    removeToken: jest.fn()
  }
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  const mockSend = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (NotificationService as any).instance = undefined;

    // Mock environment variables
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    // Mock Firebase messaging
    (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });

    notificationService = await NotificationService.getInstance();
  });

  describe('initialization', () => {
    it('should throw error when environment variables are missing', async () => {
      // Reset the singleton instance
      (NotificationService as any).instance = undefined;

      // Clear environment variables
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;

      await expect(NotificationService.getInstance())
        .rejects
        .toThrow('Missing required Firebase configuration');
    });

    it('should reuse existing instance on subsequent calls', async () => {
      const instance1 = await NotificationService.getInstance();
      const instance2 = await NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendNotification', () => {
    const userId = 'test-user';
    const token = 'test-fcm-token';

    it('should successfully send a notification when token exists', async () => {
      // Mock token retrieval
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue({
        userId,
        token,
        platform: 'android'
      });

      mockSend.mockResolvedValue('message-id');

      // Test notification data
      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: userId,
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      // Send notification
      await notificationService.sendNotification(notification);

      // Verify Firebase message was sent
      expect(mockSend).toHaveBeenCalledWith({
        token,
        notification: expect.objectContaining({
          title: expect.any(String),
          body: expect.any(String)
        }),
        data: expect.objectContaining({
          type: 'OFFER_CREATED',
          credexID: 'test-credex'
        })
      });
    });

    it('should skip sending notification when no token exists', async () => {
      // Mock token retrieval returning null
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue(null);

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: userId,
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      await notificationService.sendNotification(notification);

      // Verify no message was sent
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should remove invalid token and skip sending', async () => {
      // Mock token retrieval
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue({
        userId,
        token,
        platform: 'android'
      });

      // Mock Firebase throwing invalid token error
      mockSend.mockRejectedValue(new Error('registration-token-not-registered'));

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: userId,
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      // Send notification
      await notificationService.sendNotification(notification);

      // Verify token was removed
      expect(fcmTokenRepository.removeToken).toHaveBeenCalledWith(userId, token);
    });

    it('should throw error on Firebase failure', async () => {
      // Mock token retrieval
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue({
        userId,
        token,
        platform: 'android'
      });

      // Mock Firebase throwing error
      mockSend.mockRejectedValue(new Error('Firebase error'));

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: userId,
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      // Verify error is thrown
      await expect(notificationService.sendNotification(notification))
        .rejects
        .toThrow('Firebase error');
    });
  });

  describe('token management', () => {
    const userId = 'test-user';
    const token = 'test-fcm-token';

    it('should register token successfully', async () => {
      await notificationService.registerToken({
        userId,
        token,
        platform: 'android',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(fcmTokenRepository.saveToken).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        token,
        platform: 'android'
      }));
    });

    it('should remove token successfully', async () => {
      await notificationService.removeToken(userId, token);

      expect(fcmTokenRepository.removeToken).toHaveBeenCalledWith(userId, token);
    });

    it('should validate token before sending notification', async () => {
      const mockToken = {
        userId,
        token,
        platform: 'android'
      };

      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue(mockToken);

      mockSend
        .mockImplementationOnce(() => Promise.resolve('validation-ok')) // First call for validation
        .mockImplementationOnce(() => Promise.resolve('notification-sent')); // Second call for actual notification

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: userId,
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      await notificationService.sendNotification(notification);

      // Verify both validation and notification calls were made
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[0][1]).toBe(true); // First call with dryRun=true
      expect(mockSend.mock.calls[1][1]).toBeUndefined(); // Second call without dryRun
    });
  });
});
