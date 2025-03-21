import express from 'express';
import { appVersionAdminController } from '../controllers/appVersionAdminController';
import { authenticate } from '../../../../config/authenticate';
import { validateRequest } from '../../../middleware/validateRequest';
import { sanitizeString } from '../../../utils/inputSanitizer';

export default function appAdminRoutes() {
  const router = express.Router();

  // Request schema for creating app version
  const createAppVersionSchema = {
    appId: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'App ID is required'
      }),
      required: true
    },
    platform: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: ['android', 'ios'].includes(value),
        message: 'Platform must be android or ios'
      }),
      required: true
    },
    version: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: /^\d+\.\d+\.\d+(\+\d+)?$/.test(value),
        message: 'Version must be in format x.y.z or x.y.z+build'
      }),
      required: true
    },
    minRequiredVersion: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: /^\d+\.\d+\.\d+(\+\d+)?$/.test(value),
        message: 'Minimum required version must be in format x.y.z or x.y.z+build'
      }),
      required: true
    },
    updateUrl: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Update URL is required'
      }),
      required: true
    },
    fileSizeBytes: {
      sanitizer: (value: any) => parseInt(value, 10),
      validator: (value: number) => ({
        isValid: !isNaN(value) && value > 0,
        message: 'File size must be a positive number'
      }),
      required: true
    },
    releaseNotes: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Release notes are required'
      }),
      required: true
    },
    releaseDate: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value),
        message: 'Release date must be in ISO 8601 format (YYYY-MM-DDThh:mm:ss.sssZ)'
      }),
      required: true
    },
    updatePriority: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: ['low', 'medium', 'high', 'critical'].includes(value),
        message: 'Update priority must be low, medium, high, or critical'
      }),
      required: true
    },
    updateType: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: ['patch', 'minor', 'major'].includes(value),
        message: 'Update type must be patch, minor, or major'
      }),
      required: true
    }
  };

  // Request schema for updating app version
  const updateAppVersionSchema = {
    version: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: /^\d+\.\d+\.\d+(\+\d+)?$/.test(value),
        message: 'Version must be in format x.y.z or x.y.z+build'
      }),
      required: false
    },
    minRequiredVersion: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: /^\d+\.\d+\.\d+(\+\d+)?$/.test(value),
        message: 'Minimum required version must be in format x.y.z or x.y.z+build'
      }),
      required: false
    },
    updateUrl: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Update URL is required'
      }),
      required: false
    },
    fileSizeBytes: {
      sanitizer: (value: any) => parseInt(value, 10),
      validator: (value: number) => ({
        isValid: !isNaN(value) && value > 0,
        message: 'File size must be a positive number'
      }),
      required: false
    },
    updatePriority: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: ['low', 'medium', 'high', 'critical'].includes(value),
        message: 'Update priority must be low, medium, high, or critical'
      }),
      required: false
    },
    updateType: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: ['patch', 'minor', 'major'].includes(value),
        message: 'Update type must be patch, minor, or major'
      }),
      required: false
    },
    active: {
      sanitizer: (value: any) => value === 'true' || value === true,
      validator: (value: boolean) => ({
        isValid: typeof value === 'boolean',
        message: 'Active must be a boolean'
      }),
      required: false
    }
  };

  /**
   * @swagger
   * /api/admin/app-versions:
   *   post:
   *     tags: [Admin]
   *     summary: Create a new app version
   *     description: Creates a new app version
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - appId
   *               - platform
   *               - version
   *               - minRequiredVersion
   *               - updateUrl
   *               - fileSizeBytes
   *               - releaseNotes
   *               - releaseDate
   *               - updatePriority
   *               - updateType
   *             properties:
   *               appId:
   *                 type: string
   *                 description: App ID (e.g., com.vimbisopay.app)
   *               platform:
   *                 type: string
   *                 enum: [android, ios]
   *                 description: Platform (android or ios)
   *               version:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Version (e.g., 1.0.0 or 1.0.0+33)
   *               minRequiredVersion:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Minimum required version (e.g., 1.0.0 or 1.0.0+33)
   *               updateUrl:
   *                 type: string
   *                 description: URL to download the update
   *               fileSizeBytes:
   *                 type: number
   *                 description: Size of the update file in bytes
   *               releaseNotes:
   *                 type: string
   *                 description: Notes about the update
   *               releaseDate:
   *                 type: string
   *                 format: date-time
   *                 description: Date the update was released (ISO 8601 format)
   *               updatePriority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *                 description: Priority of the update
   *               updateType:
   *                 type: string
   *                 enum: [patch, minor, major]
   *                 description: Type of update
   *               active:
   *                 type: boolean
   *                 description: Whether the version is active
   *     responses:
   *       201:
   *         description: App version created successfully
   */
  router.post(
    '/app-versions',
    authenticate,
    validateRequest(createAppVersionSchema),
    (req, res, next) => appVersionAdminController.createAppVersion(req, res, next)
  );

  /**
   * @swagger
   * /api/admin/app-versions/{id}:
   *   get:
   *     tags: [Admin]
   *     summary: Get an app version
   *     description: Gets an app version by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: App version ID
   *     responses:
   *       200:
   *         description: App version found
   *       404:
   *         description: App version not found
   */
  router.get(
    '/app-versions/:id',
    authenticate,
    (req, res, next) => appVersionAdminController.getAppVersion(req, res, next)
  );

  /**
   * @swagger
   * /api/admin/app-versions/app/{appId}:
   *   get:
   *     tags: [Admin]
   *     summary: Get all app versions for an app
   *     description: Gets all app versions for an app
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *         description: App ID
   *     responses:
   *       200:
   *         description: App versions found
   */
  router.get(
    '/app-versions/app/:appId',
    authenticate,
    (req, res, next) => appVersionAdminController.getAppVersions(req, res, next)
  );

  /**
   * @swagger
   * /api/admin/app-versions/{id}:
   *   put:
   *     tags: [Admin]
   *     summary: Update an app version
   *     description: Updates an app version
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: App version ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               version:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Version (e.g., 1.0.0 or 1.0.0+33)
   *               minRequiredVersion:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Minimum required version (e.g., 1.0.0 or 1.0.0+33)
   *               updateUrl:
   *                 type: string
   *                 description: URL to download the update
   *               fileSizeBytes:
   *                 type: number
   *                 description: Size of the update file in bytes
   *               releaseNotes:
   *                 type: string
   *                 description: Notes about the update
   *               releaseDate:
   *                 type: string
   *                 format: date-time
   *                 description: Date the update was released (ISO 8601 format)
   *               updatePriority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *                 description: Priority of the update
   *               updateType:
   *                 type: string
   *                 enum: [patch, minor, major]
   *                 description: Type of update
   *               active:
   *                 type: boolean
   *                 description: Whether the version is active
   *     responses:
   *       200:
   *         description: App version updated successfully
   *       404:
   *         description: App version not found
   */
  router.put(
    '/app-versions/:id',
    authenticate,
    validateRequest(updateAppVersionSchema),
    (req, res, next) => appVersionAdminController.updateAppVersion(req, res, next)
  );

  /**
   * @swagger
   * /api/admin/app-versions/{id}:
   *   delete:
   *     tags: [Admin]
   *     summary: Delete an app version
   *     description: Deletes an app version
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: App version ID
   *     responses:
   *       200:
   *         description: App version deleted successfully
   *       404:
   *         description: App version not found
   */
  router.delete(
    '/app-versions/:id',
    authenticate,
    (req, res, next) => appVersionAdminController.deleteAppVersion(req, res, next)
  );

  return router;
}
