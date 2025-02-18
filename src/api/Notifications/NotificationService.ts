import * as admin from 'firebase-admin';
import { NotificationData, FCMToken } from './types';
import { logInfo, logError, logWarning, logDebug } from '../../utils/logger';
import { fcmTokenRepository } from './repositories/FCMTokenRepository';
import { denomFormatter } from '../../utils/denomUtils';
import { getConfig } from '../../../config/config';

class NotificationService {
  private static instance: NotificationService;
  private initialized: boolean = false;

  private constructor() {}

  public static async getInstance(): Promise<NotificationService> {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
      await NotificationService.instance.initializeFirebase();
    }
    return NotificationService.instance;
  }

  private async initializeFirebase(): Promise<void> {
    const initStart = Date.now();
    logInfo('Starting Firebase initialization');
    
    try {
      if (!this.initialized) {
        const configStart = Date.now();
        logDebug('Loading Firebase configuration');
        const config = await getConfig();
        const { projectId, clientEmail, privateKey } = config.firebase;

        logDebug('Firebase configuration loaded', {
          duration: Date.now() - configStart,
          hasProjectId: !!projectId,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey
        });

        const sdkStart = Date.now();
        logDebug('Initializing Firebase Admin SDK');
        
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines in environment variable
          }),
          projectId
        });
        
        this.initialized = true;
        const totalDuration = Date.now() - initStart;
        logInfo('Firebase Admin SDK initialized successfully', { 
          projectId,
          duration: totalDuration
        });
      }
    } catch (error) {
      const totalDuration = Date.now() - initStart;
      logError('Failed to initialize Firebase Admin SDK', error as Error, {
        duration: totalDuration,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      throw error;
    }
  }

  private ensureInitialized(): void {
    logDebug('Checking Firebase initialization status');
    if (!this.initialized) {
      const error = new Error('Firebase Admin SDK not initialized');
      logError('Firebase initialization failed', error);
      throw error;
    }
    logDebug('Firebase initialization confirmed');
  }

  public async validateToken(token: string): Promise<boolean> {
    logDebug('Entering validateToken', { tokenLength: token?.length });
    this.ensureInitialized();
    try {
      logDebug('Creating validation message');
      const message: admin.messaging.Message = {
        token,
        data: { validate: 'true' },
        android: {
          priority: 'high'
        },
        apns: { 
          payload: { 
            aps: { 
              'content-available': 1 
            } 
          } 
        }
      };

      logDebug('Sending validation message in dryRun mode');
      await admin.messaging().send(message, true);
      logInfo('Token validation successful');
      return true;
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        // Check for specific Firebase invalid token errors
        if (
          errorMessage.includes('invalid-argument') ||
          errorMessage.includes('registration-token-not-registered') ||
          errorMessage.includes('invalid-registration-token')
        ) {
          logWarning('Invalid FCM token detected', { error: error.message });
          return false;
        }
      }
      logError('Error validating FCM token', error as Error);
      logDebug('Token validation context', { tokenLength: token?.length });
      return true;
    }
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    logDebug('Starting retry with backoff', { maxAttempts, baseDelay });
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logDebug(`Attempt ${attempt} of ${maxAttempts}`);
        const result = await fn();
        logDebug(`Attempt ${attempt} successful`);
        return result;
      } catch (error) {
        if (attempt === maxAttempts) {
          logError('Final retry attempt failed', error as Error);
          logDebug('Retry context', { attempt, maxAttempts });
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        logWarning(`Retry attempt ${attempt} failed, retrying in ${delay}ms`, {
          nextAttempt: attempt + 1,
          delay
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    const error = new Error('All retry attempts failed');
    logError('Retry with backoff failed', error);
    logDebug('Retry context', { maxAttempts, baseDelay });
    throw error;
  }

  public async sendNotification(notification: NotificationData): Promise<void> {
    logDebug('Entering sendNotification', { 
      type: notification.type,
      recipientID: notification.recipientID 
    });
    this.ensureInitialized();
    try {
      logDebug('Getting user token');
      const userToken = await this.getUserToken(notification.recipientID);
      
      if (!userToken) {
        logWarning(`No FCM token found for user ${notification.recipientID}`);
        return;
      }

      logDebug('Validating token before sending');
      const isValid = await this.validateToken(userToken.token);
      if (!isValid) {
        logWarning(`Invalid FCM token for user ${notification.recipientID}, removing token`);
        await this.removeToken(notification.recipientID, userToken.token);
        return;
      }

      logDebug('Creating notification message');
      const message: admin.messaging.Message = {
        token: userToken.token,
        notification: {
          title: this.getNotificationTitle(notification.type),
          body: this.getNotificationBody(notification),
        },
        data: {
          type: notification.type,
          credexID: notification.data.credexID,
          ...this.formatNotificationData(notification.data),
        },
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              priority: 10,
            },
          },
        },
      };

      logDebug('Sending notification with retry');
      const response = await this.retryWithBackoff(
        () => admin.messaging().send(message),
        3, // max attempts
        1000 // base delay in ms
      );
      logInfo('Successfully sent notification', {
        service: 'credex-core',
        type: notification.type,
        recipientID: notification.recipientID,
        messageId: response,
        data: {
          ...notification.data,
          amount: notification.data.amount ? denomFormatter(parseFloat(notification.data.amount), notification.data.denomination || '') : undefined
        }
      });
    } catch (error) {
      logError('Error sending notification', error as Error);
      logDebug('Notification context', {
        type: notification.type,
        recipientID: notification.recipientID
      });
      throw error;
    }
  }

  private getNotificationTitle(type: NotificationData['type']): string {
    const titles = {
      OFFER_CREATED: 'New Credex Offer',
      OFFER_CANCELLED: 'Offer Cancelled',
      OFFER_ACCEPTED: 'Offer Accepted',
      OFFER_DECLINED: 'Offer Declined',
      CREDLOOP_COMPLETED: 'Credloop Completed',
    };
    return titles[type];
  }

  private getNotificationBody(notification: NotificationData): string {
    const { type, data } = notification;
    
    switch (type) {
      case 'OFFER_CREATED':
        return `${data.counterpartyName} sent you an offer for ${data.amount} ${data.denomination}`;
      case 'OFFER_CANCELLED':
        return `An offer for ${data.amount} ${data.denomination} was cancelled`;
      case 'OFFER_ACCEPTED':
        return `Your offer for ${data.amount} ${data.denomination} was accepted`;
      case 'OFFER_DECLINED':
        return `Your offer for ${data.amount} ${data.denomination} was declined`;
      case 'CREDLOOP_COMPLETED':
        return this.getCredloopMessage(data);
      default:
        return 'New Credex notification';
    }
  }

  private getCredloopMessage(data: NotificationData['data']): string {
    const clearedPayable = data.clearedPayable;
    const clearedReceivable = data.clearedReceivable;
    
    if (clearedPayable && clearedReceivable) {
      return `Credloop completed: Cleared ${clearedPayable.amount} ${clearedPayable.denomination} owed to ${clearedPayable.owedTo} and ${clearedReceivable.amount} ${clearedReceivable.denomination} owed from ${clearedReceivable.owedFrom}`;
    } else if (clearedPayable) {
      return `Credloop completed: Cleared ${clearedPayable.amount} ${clearedPayable.denomination} owed to ${clearedPayable.owedTo}`;
    } else if (clearedReceivable) {
      return `Credloop completed: Cleared ${clearedReceivable.amount} ${clearedReceivable.denomination} owed from ${clearedReceivable.owedFrom}`;
    }
    return 'Credloop completed successfully';
  }

  private formatNotificationData(data: NotificationData['data']): Record<string, string> {
    // Firebase Cloud Messaging only accepts string values in data payload
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value === undefined) return acc;
      if (typeof value === 'object') {
        acc[key] = JSON.stringify(value);
      } else {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>);
  }

  private async getUserToken(userId: string): Promise<FCMToken | null> {
    try {
      return await fcmTokenRepository.getToken(userId);
    } catch (error) {
      logError('Error retrieving FCM token', error as Error);
      logDebug('Token retrieval context', { userId });
      return null;
    }
  }

  public async registerToken(token: FCMToken): Promise<void> {
    this.ensureInitialized();
    try {
      await fcmTokenRepository.saveToken({
        ...token,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logInfo('FCM token registered successfully', { userId: token.userId });
    } catch (error) {
      logError('Error registering FCM token', error as Error);
      logDebug('Token registration context', { 
        userId: token.userId,
        platform: token.platform 
      });
      throw error;
    }
  }

  public async removeToken(userId: string, token: string): Promise<void> {
    this.ensureInitialized();
    try {
      await fcmTokenRepository.removeToken(userId, token);
      logInfo('FCM token removed successfully', { userId });
    } catch (error) {
      logError('Error removing FCM token', error as Error);
      logDebug('Token removal context', { userId });
      throw error;
    }
  }
}

// Export the class
export { NotificationService };
