import express from 'express';
import { NotificationService } from '../NotificationService';
import { fcmTokenRepository } from '../repositories/FCMTokenRepository';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { validateRequest } from '../../../middleware/validateRequest';
import { v } from '../../../utils/validators';
import * as s from '../../../utils/inputSanitizer';
import logger from '../../../utils/logger';

const router = express.Router();
let notificationService: Awaited<ReturnType<typeof NotificationService.getInstance>>;

// Initialize notification service
(async () => {
  try {
    logger.info('Initializing notification service');
    notificationService = await NotificationService.getInstance();
    logger.info('Notification service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize notification service', error as Error);
    // Don't exit process - service will return 503 when used
  }
})();

/**
 * @swagger
 * /api/notifications/health:
 *   get:
 *     tags: [Notifications]
 *     summary: Check notification service health
 *     description: Returns the health status of the notification service
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 message:
 *                   type: string
 *                   example: Notification service initialized and ready
 *       503:
 *         description: Service is not initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Notification service not initialized
 *                 details:
 *                   type: string
 *                   example: The service failed to initialize. Check logs for details.
 */
router.get('/health', (req, res) => {
  const requestId = req.id;
  logger.debug('Checking notification service health', { requestId });

  if (!notificationService) {
    logger.error('Notification service not initialized', { requestId });
    return res.status(503).json({
      status: 'error',
      message: 'Notification service not initialized',
      details: 'The service failed to initialize. Check logs for details.'
    });
  }

  res.status(200).json({
    status: 'healthy',
    message: 'Notification service initialized and ready'
  });
});

// Validation schemas
const registerTokenSchema = {
  token: {
    sanitizer: s.sanitizeString,
    validator: v.isNonEmptyString,
    required: true
  },
  platform: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => ({
      isValid: ['ios', 'android'].includes(value.toLowerCase()),
      message: 'Platform must be either "ios" or "android"'
    }),
    required: true
  }
};

const validateTokenSchema = {
  token: {
    sanitizer: s.sanitizeString,
    validator: v.isNonEmptyString,
    required: true
  }
};

const testNotificationSchema = {
  title: {
    sanitizer: s.sanitizeString,
    validator: v.isNonEmptyString,
    required: true
  },
  body: {
    sanitizer: s.sanitizeString,
    validator: v.isNonEmptyString,
    required: true
  }
};

/**
 * @swagger
 * /api/notifications/register-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Register FCM token for a user
 *     description: Register a Firebase Cloud Messaging token for push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *                 description: Device platform
 *     responses:
 *       200:
 *         description: Token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: Member not found
 *       503:
 *         description: Service unavailable
 */
router.post(
  '/register-token',
  authMiddleware(),
  validateRequest(registerTokenSchema),
  async (req, res) => {
    const requestId = req.id;
    logger.debug('Entering register-token endpoint', { 
      requestId,
      memberID: req.user?.memberID,
      platform: req.body?.platform,
      tokenLength: req.body?.token?.length
    });

    try {
      if (!req.user?.memberID) {
        logger.warn('No memberID in request', { requestId });
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { token, platform } = req.body;
      const userId = req.user.memberID;

      if (!notificationService) {
        logger.error('Notification service not initialized', { requestId });
        return res.status(503).json({
          success: false,
          message: 'Notification service not initialized',
          details: 'The service is still initializing or failed to initialize. Please try again later.'
        });
      }

      try {
        logger.debug('Registering token', { requestId, userId, platform });
        await notificationService.registerToken({
          token,
          userId,
          platform,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        logger.info('Token registered successfully', { requestId, userId, platform });
        res.status(200).json({
          success: true,
          message: 'Token registered successfully'
        });
      } catch (error) {
        logger.error('Error in registerToken', error as Error, {
          requestId,
          userId,
          platform
        });

        if (error instanceof Error && error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            message: error.message,
            details: 'Member record not found in database. Please ensure member is properly registered.'
          });
        }
        throw error;
      }
    } catch (error) {
      logger.error('Unhandled error in register-token', error as Error, { requestId });
      
      if (error instanceof Error && error.message.includes('connection')) {
        return res.status(503).json({
          success: false,
          message: 'Database connection error',
          details: 'Unable to connect to database. Please try again later.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to register token',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/notifications/validate-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Validate FCM token
 *     description: Validate a Firebase Cloud Messaging token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase Cloud Messaging token to validate
 *     responses:
 *       200:
 *         description: Token validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isValid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: User not authenticated
 *       503:
 *         description: Service unavailable
 */
router.post(
  '/validate-token',
  authMiddleware(),
  validateRequest(validateTokenSchema),
  async (req, res) => {
    const requestId = req.id;
    logger.debug('Entering validate-token endpoint', {
      requestId,
      memberID: req.user?.memberID,
      tokenLength: req.body?.token?.length
    });

    try {
      if (!req.user?.memberID) {
        logger.warn('No memberID in request', { requestId });
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { token } = req.body;
      if (!notificationService) {
        logger.error('Notification service not initialized', { requestId });
        return res.status(503).json({
          success: false,
          message: 'Notification service not initialized',
          details: 'The service is still initializing or failed to initialize. Please try again later.'
        });
      }

      logger.debug('Validating token', { requestId });
      const isValid = await notificationService.validateToken(token);

      logger.info('Token validation completed', { requestId, isValid });
      res.status(200).json({
        success: true,
        isValid,
        message: isValid ? 'Token is valid' : 'Token is invalid'
      });
    } catch (error) {
      logger.error('Error validating token', error as Error, { requestId });
      res.status(500).json({
        success: false,
        message: 'Failed to validate token',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     tags: [Notifications]
 *     summary: Send test notification
 *     description: Send a test notification to the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *                 description: Notification title
 *               body:
 *                 type: string
 *                 description: Notification body
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       400:
 *         description: No FCM token registered for user
 *       401:
 *         description: User not authenticated
 *       503:
 *         description: Service unavailable
 */
router.post(
  '/test',
  authMiddleware(),
  validateRequest(testNotificationSchema),
  async (req, res) => {
    const requestId = req.id;
    logger.debug('Entering test notification endpoint', {
      requestId,
      memberID: req.user?.memberID
    });

    try {
      if (!req.user?.memberID) {
        logger.warn('No memberID in request', { requestId });
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { title, body } = req.body;
      const userId = req.user.memberID;

      logger.debug('Checking for existing FCM token', { requestId, userId });
      const userToken = await fcmTokenRepository.getToken(userId);
      if (!userToken) {
        logger.warn('No FCM token found for user', { requestId, userId });
        return res.status(400).json({
          success: false,
          message: 'No FCM token registered for user. Please register a token first using /register-token endpoint'
        });
      }

      if (!notificationService) {
        logger.error('Notification service not initialized', { requestId });
        return res.status(503).json({
          success: false,
          message: 'Notification service not initialized',
          details: 'The service is still initializing or failed to initialize. Please try again later.'
        });
      }

      try {
        logger.debug('Sending test notification', { requestId, userId });
        await notificationService.sendNotification({
          type: 'OFFER_CREATED',
          recipientID: userId,
          data: {
            credexID: 'test-credex',
            amount: '100',
            denomination: 'USD',
            counterpartyName: 'Test User',
            action: title,
            testMessage: body
          }
        });

        logger.info('Test notification sent successfully', { requestId, userId });
        res.status(200).json({
          success: true,
          message: 'Test notification sent successfully'
        });
      } catch (error) {
        logger.error('Error sending test notification', error as Error, { requestId, userId });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
          success: false,
          message: 'Failed to send test notification',
          error: errorMessage,
          details: 'Token exists but notification sending failed. Check Firebase configuration and logs.'
        });
      }
    } catch (error) {
      logger.error('Unhandled error in test notification', error as Error, { requestId });
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
