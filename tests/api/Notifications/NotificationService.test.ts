import { NotificationService } from '../../../src/api/Notifications/NotificationService';
import { fcmTokenRepository } from '../../../src/api/Notifications/repositories/FCMTokenRepository';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  messaging: jest.fn(() => ({
    send: jest.fn()
  }))
}));

// Mock FCMTokenRepository
jest.mock('../../../src/api/Notifications/repositories/FCMTokenRepository', () => ({
  fcmTokenRepository: {
    getToken: jest.fn(),
    saveToken: jest.fn(),
    removeToken: jest.fn()
  }
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    
    notificationService = await NotificationService.getInstance();
  });

  describe('initialization', () => {
    it('should initialize Firebase Admin SDK successfully', async () => {
      expect(admin.initializeApp).toHaveBeenCalledWith(expect.objectContaining({
        credential: expect.any(Object),
        projectId: 'test-project'
      }));
    });

    it('should throw error when Firebase configuration is missing', async () => {
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
      expect(admin.initializeApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendNotification', () => {
    it('should successfully send a notification when token exists', async () => {
      // Mock token retrieval
      const mockToken = {
        token: 'test-fcm-token',
        userId: 'test-user',
        platform: 'android' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue(mockToken);

      // Mock Firebase messaging
      const mockSend = jest.fn().mockResolvedValue('message-id');
      (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });

      // Test notification data
      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: 'test-user',
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      // Send notification
      await notificationService.sendNotification(notification);

      // Verify token was retrieved
      expect(fcmTokenRepository.getToken).toHaveBeenCalledWith('test-user');

      // Verify message was sent with correct format
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        token: 'test-fcm-token',
        notification: expect.objectContaining({
          title: expect.any(String),
          body: expect.any(String)
        }),
        data: expect.objectContaining({
          type: 'OFFER_CREATED',
          credexID: 'test-credex'
        })
      }));
    });

    it('should skip sending notification when no token exists', async () => {
      // Mock token retrieval returning null
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue(null);

      const mockSend = jest.fn();
      (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: 'test-user',
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      await notificationService.sendNotification(notification);

      // Verify token was attempted to be retrieved
      expect(fcmTokenRepository.getToken).toHaveBeenCalledWith('test-user');

      // Verify no message was sent
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle invalid token errors', async () => {
      // Mock token retrieval
      const mockToken = {
        token: 'invalid-token',
        userId: 'test-user',
        platform: 'android' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue(mockToken);

      // Mock Firebase messaging error for invalid token
      const mockError = new Error('registration-token-not-registered');
      const mockSend = jest.fn().mockRejectedValue(mockError);
      (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: 'test-user',
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      // Send notification
      await notificationService.sendNotification(notification);

      // Verify token removal was attempted
      expect(fcmTokenRepository.removeToken).toHaveBeenCalledWith('test-user', 'invalid-token');
    });

    it('should handle Firebase messaging errors gracefully', async () => {
      // Mock token retrieval
      const mockToken = {
        token: 'test-fcm-token',
        userId: 'test-user',
        platform: 'android' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue(mockToken);

      // Mock Firebase messaging error
      const mockError = new Error('Firebase messaging error');
      const mockSend = jest.fn().mockRejectedValue(mockError);
      (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: 'test-user',
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
        .toThrow('Firebase messaging error');
    });
  });

  describe('token management', () => {
    it('should successfully register a new token', async () => {
      const token = {
        token: 'new-fcm-token',
        userId: 'test-user',
        platform: 'ios' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await notificationService.registerToken(token);

      expect(fcmTokenRepository.saveToken).toHaveBeenCalledWith(expect.objectContaining({
        token: token.token,
        userId: token.userId,
        platform: token.platform
      }));
    });

    it('should successfully remove a token', async () => {
      const userId = 'test-user';
      const token = 'test-token';

      await notificationService.removeToken(userId, token);

      expect(fcmTokenRepository.removeToken).toHaveBeenCalledWith(userId, token);
    });

    it('should validate token before sending notification', async () => {
      const mockToken = {
        token: 'test-fcm-token',
        userId: 'test-user',
        platform: 'android' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (fcmTokenRepository.getToken as jest.Mock).mockResolvedValue(mockToken);

      // Mock validation message send
      const mockSend = jest.fn()
        .mockImplementationOnce(() => Promise.resolve('validation-ok')) // First call for validation
        .mockImplementationOnce(() => Promise.resolve('notification-sent')); // Second call for actual notification
      (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });

      const notification = {
        type: 'OFFER_CREATED' as const,
        recipientID: 'test-user',
        data: {
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: 'Test User'
        }
      };

      await notificationService.sendNotification(notification);

      // Verify validation was attempted
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[0][0]).toMatchObject({
        token: 'test-fcm-token',
        data: { validate: 'true' }
      });
    });
  });
});
