import express from 'express';
import { AppVersionController } from '../controllers/appVersionController';
import { verifyClientApiKey } from '../../../middleware/clientApiKeyAuth';
import { rateLimiter } from '../../../middleware/rateLimiter';
import { validateRequest } from '../../../middleware/validateRequest';
import { sanitizeString } from '../../../utils/inputSanitizer';

export default function appRoutes() {
  const router = express.Router();

  // Request schema for version check
  const versionCheckSchema = {
    app_id: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'App ID is required'
      }),
      required: true
    },
    current_version: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: /^\d+\.\d+\.\d+(\+\d+)?$/.test(value),
        message: 'Current version must be in format x.y.z or x.y.z+build'
      }),
      required: true
    }
  };

  // Rate limiting for version check is handled by the rateLimiter middleware

  /**
   * @swagger
   * /app/version-check:
   *   post:
   *     tags: [App]
   *     summary: Check for app updates
   *     description: |
   *       Checks if an update is available for the app based on the current version.
   *       Returns update information if an update is available, including whether the update is required.
   *       The endpoint uses semantic versioning to compare versions and supports build numbers (e.g., 1.0.0+33).
   *     security:
   *       - clientApiKey: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - app_id
   *               - current_version
   *             properties:
   *               app_id:
   *                 type: string
   *                 description: App ID (e.g., com.vimbisopay.app)
   *                 example: "com.vimbisopay.app"
   *               current_version:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Current app version (e.g., 1.0.0 or 1.0.0+33)
   *                 example: "1.0.0"
   *               device_info:
   *                 type: object
   *                 description: Information about the device
   *                 properties:
   *                   android_version:
   *                     type: string
   *                     description: Android OS version
   *                     example: "12"
   *                   ios_version:
   *                     type: string
   *                     description: iOS version
   *                     example: "15.0"
   *                   device_model:
   *                     type: string
   *                     description: Device model
   *                     example: "Pixel 6"
   *                   screen_size:
   *                     type: string
   *                     description: Screen resolution
   *                     example: "1080x2400"
   *               user_info:
   *                 type: object
   *                 description: Information about the user
   *                 properties:
   *                   user_id:
   *                     type: string
   *                     description: User ID
   *                     example: "user123"
   *     responses:
   *       200:
   *         description: Version check successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Response message
   *                   example: "Update available"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           description: App ID
   *                           example: "com.vimbisopay.app"
   *                         type:
   *                           type: string
   *                           enum: [APP_VERSION_CHECK]
   *                           description: Action type
   *                           example: "APP_VERSION_CHECK"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: Action timestamp
   *                           example: "2025-03-20T18:30:00.000Z"
   *                         actor:
   *                           type: string
   *                           description: Actor who performed the action
   *                           example: "system"
   *                         details:
   *                           type: object
   *                           properties:
   *                             update_available:
   *                               type: boolean
   *                               description: Whether an update is available
   *                               example: true
   *                             latest_version:
   *                               type: string
   *                               description: Latest version available
   *                               example: "1.1.0"
   *                             update_required:
   *                               type: boolean
   *                               description: Whether the update is required
   *                               example: false
   *                             update_priority:
   *                               type: string
   *                               enum: [low, medium, high, critical]
   *                               description: Priority of the update
   *                               example: "medium"
   *                             update_type:
   *                               type: string
   *                               enum: [patch, minor, major]
   *                               description: Type of update
   *                               example: "patch"
   *                             update_url:
   *                               type: string
   *                               description: URL to download the update
   *                               example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk"
   *                             file_size_bytes:
   *                               type: number
   *                               description: Size of the update file in bytes
   *                               example: 15728640
   *                             release_notes:
   *                               type: string
   *                               description: Notes about the update
   *                               example: "Bug fixes and performance improvements"
   *                             release_date:
   *                               type: string
   *                               format: date-time
   *                               description: Date the update was released
   *                               example: "2025-03-15T00:00:00Z"
   *       400:
   *         description: Bad request - missing required parameters
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Missing required parameters: app_id or current_version"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: null
   *                         type:
   *                           type: string
   *                           example: "ERROR_VALIDATION"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: "system"
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: "INVALID_REQUEST"
   *                             reason:
   *                               type: string
   *                               example: "Missing required parameters: app_id or current_version"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "An error occurred while checking for updates"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: null
   *                         type:
   *                           type: string
   *                           example: "ERROR_INTERNAL"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: "system"
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: "UNKNOWN_ERROR"
   *                             reason:
   *                               type: string
   *                               example: "An unexpected error occurred"
   */
  router.post(
    '/version-check',
    verifyClientApiKey,
    rateLimiter,
    validateRequest(versionCheckSchema),
    AppVersionController
  );

  /**
   * @swagger
   * /app/version-check/test:
   *   post:
   *     tags: [App]
   *     summary: Test app update check
   *     description: |
   *       Test endpoint that always returns an update is available.
   *       This endpoint is useful for testing the update flow in the app without having to create a new app version.
   *     security:
   *       - clientApiKey: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               app_id:
   *                 type: string
   *                 description: App ID (e.g., com.vimbisopay.app)
   *                 example: "com.vimbisopay.app"
   *               current_version:
   *                 type: string
   *                 description: Current app version (e.g., 1.0.0 or 1.0.0+33)
   *                 example: "1.0.0"
   *     responses:
   *       200:
   *         description: Test update response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Update available"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "com.vimbisopay.app"
   *                         type:
   *                           type: string
   *                           example: "APP_VERSION_CHECK"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: "system"
   *                         details:
   *                           type: object
   *                           properties:
   *                             update_available:
   *                               type: boolean
   *                               example: true
   *                             latest_version:
   *                               type: string
   *                               example: "1.1.0"
   *                             update_required:
   *                               type: boolean
   *                               example: false
   *                             update_priority:
   *                               type: string
   *                               example: "medium"
   *                             update_type:
   *                               type: string
   *                               example: "patch"
   *                             update_url:
   *                               type: string
   *                               example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk"
   *                             file_size_bytes:
   *                               type: number
   *                               example: 15728640
   *                             release_notes:
   *                               type: string
   *                               example: "Bug fixes and performance improvements"
   *                             release_date:
   *                               type: string
   *                               example: "2025-03-15T00:00:00Z"
   */
  router.post(
    '/version-check/test',
    verifyClientApiKey,
    rateLimiter,
    (req, res) => {
      res.status(200).json({
        message: "Update available",
        data: {
          action: {
            id: req.body.app_id || "com.vimbisopay.app",
            type: "APP_VERSION_CHECK",
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              update_available: true,
              latest_version: "1.1.0",
              update_required: false,
              update_priority: "medium",
              update_type: "patch",
              update_url: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk",
              file_size_bytes: 15728640,
              release_notes: "Bug fixes and performance improvements",
              release_date: "2025-03-15T00:00:00Z"
            }
          },
          dashboard: {}
        }
      });
    }
  );

  return router;
}
