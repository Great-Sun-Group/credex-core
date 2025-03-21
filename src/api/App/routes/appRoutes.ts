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
   * /api/app/version-check:
   *   post:
   *     tags: [App]
   *     summary: Check for app updates
   *     description: Checks if an update is available for the app
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
   *               current_version:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Current app version (e.g., 1.0.0 or 1.0.0+33)
   *               device_info:
   *                 type: object
   *                 properties:
   *                   android_version:
   *                     type: string
   *                   ios_version:
   *                     type: string
   *                   device_model:
   *                     type: string
   *                   screen_size:
   *                     type: string
   *               user_info:
   *                 type: object
   *                 properties:
   *                   user_id:
   *                     type: string
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
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         type:
   *                           type: string
   *                           enum: [APP_VERSION_CHECK]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             update_available:
   *                               type: boolean
   *                             latest_version:
   *                               type: string
   *                             update_required:
   *                               type: boolean
   *                             update_priority:
   *                               type: string
   *                               enum: [low, medium, high, critical]
   *                             update_type:
   *                               type: string
   *                               enum: [patch, minor, major]
   *                             update_url:
   *                               type: string
   *                             file_size_bytes:
   *                               type: number
   *                             release_notes:
   *                               type: string
   *                             release_date:
   *                               type: string
   *                               format: date-time
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
   * /api/app/version-check/test:
   *   post:
   *     tags: [App]
   *     summary: Test app update check
   *     description: Test endpoint that always returns an update is available
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
   *               current_version:
   *                 type: string
   *     responses:
   *       200:
   *         description: Test update response
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
