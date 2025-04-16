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
    },
    // Checksum fields
    checksumAlgorithm: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Checksum algorithm is required'
      }),
      required: true
    },
    checksumUniversal: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Universal checksum is required'
      }),
      required: true
    },
    checksumArm64: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'ARM64 checksum is required'
      }),
      required: true
    },
    checksumArm: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'ARM checksum is required'
      }),
      required: true
    },
    checksumX86_64: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'x86_64 checksum is required'
      }),
      required: true
    },
    checksumUrl: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Checksum URL is required'
      }),
      required: true
    },
    architectureSpecificDownloads: {
      sanitizer: (value: any) => value,
      validator: (value: any) => ({
        isValid: value && typeof value === 'object' && 
                 'arm64-v8a' in value && 
                 'armeabi-v7a' in value && 
                 'x86_64' in value,
        message: 'Architecture-specific downloads must include arm64-v8a, armeabi-v7a, and x86_64'
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
    },
    // Checksum fields
    checksumAlgorithm: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Checksum algorithm is required'
      }),
      required: false
    },
    checksumUniversal: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Universal checksum is required'
      }),
      required: false
    },
    checksumArm64: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'ARM64 checksum is required'
      }),
      required: false
    },
    checksumArm: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'ARM checksum is required'
      }),
      required: false
    },
    checksumX86_64: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'x86_64 checksum is required'
      }),
      required: false
    },
    checksumUrl: {
      sanitizer: sanitizeString,
      validator: (value: string) => ({
        isValid: !!value,
        message: 'Checksum URL is required'
      }),
      required: false
    },
    architectureSpecificDownloads: {
      sanitizer: (value: any) => value,
      validator: (value: any) => ({
        isValid: !value || (typeof value === 'object' && 
                 'arm64-v8a' in value && 
                 'armeabi-v7a' in value && 
                 'x86_64' in value),
        message: 'Architecture-specific downloads must include arm64-v8a, armeabi-v7a, and x86_64'
      }),
      required: false
    }
  };

  /**
   * @swagger
   * /admin/app-versions:
   *   post:
   *     tags: [Admin]
   *     summary: Create a new app version
   *     description: |
   *       Creates a new app version. When a new version is created with `active: true`, 
   *       all other versions for the same app and platform are automatically set to inactive.
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
   *                 example: "com.vimbisopay.app"
   *               platform:
   *                 type: string
   *                 enum: [android, ios]
   *                 description: Platform (android or ios)
   *                 example: "android"
   *               version:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Version (e.g., 1.0.0 or 1.0.0+33)
   *                 example: "1.1.0"
   *               minRequiredVersion:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Minimum required version (e.g., 1.0.0 or 1.0.0+33)
   *                 example: "1.0.0"
   *               updateUrl:
   *                 type: string
   *                 description: URL to download the update
   *                 example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk"
   *               fileSizeBytes:
   *                 type: number
   *                 description: Size of the update file in bytes
   *                 example: 15728640
   *               releaseNotes:
   *                 type: string
   *                 description: Notes about the update
   *                 example: "Bug fixes and performance improvements"
   *               releaseDate:
   *                 type: string
   *                 format: date-time
   *                 description: Date the update was released (ISO 8601 format)
   *                 example: "2025-03-15T00:00:00Z"
   *               updatePriority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *                 description: Priority of the update
   *                 example: "medium"
   *               updateType:
   *                 type: string
   *                 enum: [patch, minor, major]
   *                 description: Type of update
   *                 example: "patch"
   *               active:
   *                 type: boolean
   *                 description: Whether the version is active (default is true)
   *                 example: true
   *               checksumAlgorithm:
   *                 type: string
   *                 description: Hash algorithm used for checksums
   *                 example: "sha256"
   *               checksumUniversal:
   *                 type: string
   *                 description: Checksum of the universal APK
   *                 example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   *               checksumArm64:
   *                 type: string
   *                 description: Checksum of the ARM64 APK
   *                 example: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1"
   *               checksumArm:
   *                 type: string
   *                 description: Checksum of the ARM APK
   *                 example: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2"
   *               checksumX86_64:
   *                 type: string
   *                 description: Checksum of the x86_64 APK
   *                 example: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3"
   *               checksumUrl:
   *                 type: string
   *                 description: URL to download the checksums file
   *                 example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-checksums.txt"
   *               architectureSpecificDownloads:
   *                 type: object
   *                 description: Architecture-specific download URLs
   *                 properties:
   *                   arm64-v8a:
   *                     type: string
   *                     description: URL to download the ARM64 APK
   *                     example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm64.apk"
   *                   armeabi-v7a:
   *                     type: string
   *                     description: URL to download the ARM APK
   *                     example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm.apk"
   *                   x86_64:
   *                     type: string
   *                     description: URL to download the x86_64 APK
   *                     example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-x86_64.apk"
   *     responses:
   *       201:
   *         description: App version created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App version created successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "123e4567-e89b-12d3-a456-426614174000"
   *                         type:
   *                           type: string
   *                           example: "APP_VERSION_CHECK"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                               example: "123e4567-e89b-12d3-a456-426614174000"
   *                             appId:
   *                               type: string
   *                               example: "com.vimbisopay.app"
   *                             platform:
   *                               type: string
   *                               example: "android"
   *                             version:
   *                               type: string
   *                               example: "1.1.0"
   *                             minRequiredVersion:
   *                               type: string
   *                               example: "1.0.0"
   *                             updateUrl:
   *                               type: string
   *                               example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk"
   *                             fileSizeBytes:
   *                               type: number
   *                               example: 15728640
   *                             releaseNotes:
   *                               type: string
   *                               example: "Bug fixes and performance improvements"
   *                             releaseDate:
   *                               type: string
   *                               example: "2025-03-15T00:00:00Z"
   *                             updatePriority:
   *                               type: string
   *                               example: "medium"
   *                             updateType:
   *                               type: string
   *                               example: "patch"
   *                             active:
   *                               type: boolean
   *                               example: true
   *                             checksumAlgorithm:
   *                               type: string
   *                               description: Hash algorithm used for checksums
   *                               example: "sha256"
   *                             checksumUniversal:
   *                               type: string
   *                               description: Checksum of the universal APK
   *                               example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   *                             checksumArm64:
   *                               type: string
   *                               description: Checksum of the ARM64 APK
   *                               example: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1"
   *                             checksumArm:
   *                               type: string
   *                               description: Checksum of the ARM APK
   *                               example: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2"
   *                             checksumX86_64:
   *                               type: string
   *                               description: Checksum of the x86_64 APK
   *                               example: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3"
   *                             checksumUrl:
   *                               type: string
   *                               description: URL to download the checksums file
   *                               example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-checksums.txt"
   *                             architectureSpecificDownloads:
   *                               type: object
   *                               description: Architecture-specific download URLs
   *                               properties:
   *                                 arm64-v8a:
   *                                   type: string
   *                                   description: URL to download the ARM64 APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm64.apk"
   *                                 armeabi-v7a:
   *                                   type: string
   *                                   description: URL to download the ARM APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm.apk"
   *                                 x86_64:
   *                                   type: string
   *                                   description: URL to download the x86_64 APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-x86_64.apk"
   *                             createdAt:
   *                               type: string
   *                               format: date-time
   *                             updatedAt:
   *                               type: string
   *                               format: date-time
   *       400:
   *         description: Bad request - missing required parameters
   *       500:
   *         description: Internal server error
   */
  router.post(
    '/app-versions',
    authenticate,
    validateRequest(createAppVersionSchema),
    (req, res, next) => appVersionAdminController.createAppVersion(req, res, next)
  );

  /**
   * @swagger
   * /admin/app-versions/{id}:
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
   *         example: "123e4567-e89b-12d3-a456-426614174000"
   *     responses:
   *       200:
   *         description: App version found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App version found"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "123e4567-e89b-12d3-a456-426614174000"
   *                         type:
   *                           type: string
   *                           example: "APP_VERSION_CHECK"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                               example: "123e4567-e89b-12d3-a456-426614174000"
   *                             appId:
   *                               type: string
   *                               example: "com.vimbisopay.app"
   *                             platform:
   *                               type: string
   *                               example: "android"
   *                             version:
   *                               type: string
   *                               example: "1.1.0"
   *                             minRequiredVersion:
   *                               type: string
   *                               example: "1.0.0"
   *                             updateUrl:
   *                               type: string
   *                               example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk"
   *                             fileSizeBytes:
   *                               type: number
   *                               example: 15728640
   *                             releaseNotes:
   *                               type: string
   *                               example: "Bug fixes and performance improvements"
   *                             releaseDate:
   *                               type: string
   *                               example: "2025-03-15T00:00:00Z"
   *                             updatePriority:
   *                               type: string
   *                               example: "medium"
   *                             updateType:
   *                               type: string
   *                               example: "patch"
   *                             active:
   *                               type: boolean
   *                               example: true
   *                             checksumAlgorithm:
   *                               type: string
   *                               description: Hash algorithm used for checksums
   *                               example: "sha256"
   *                             checksumUniversal:
   *                               type: string
   *                               description: Checksum of the universal APK
   *                               example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   *                             checksumArm64:
   *                               type: string
   *                               description: Checksum of the ARM64 APK
   *                               example: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1"
   *                             checksumArm:
   *                               type: string
   *                               description: Checksum of the ARM APK
   *                               example: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2"
   *                             checksumX86_64:
   *                               type: string
   *                               description: Checksum of the x86_64 APK
   *                               example: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3"
   *                             checksumUrl:
   *                               type: string
   *                               description: URL to download the checksums file
   *                               example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-checksums.txt"
   *                             architectureSpecificDownloads:
   *                               type: object
   *                               description: Architecture-specific download URLs
   *                               properties:
   *                                 arm64-v8a:
   *                                   type: string
   *                                   description: URL to download the ARM64 APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm64.apk"
   *                                 armeabi-v7a:
   *                                   type: string
   *                                   description: URL to download the ARM APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm.apk"
   *                                 x86_64:
   *                                   type: string
   *                                   description: URL to download the x86_64 APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-x86_64.apk"
   *                             createdAt:
   *                               type: string
   *                               format: date-time
   *                             updatedAt:
   *                               type: string
   *                               format: date-time
   *       404:
   *         description: App version not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App version not found"
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
   *                           example: "ERROR_NOT_FOUND"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: "NOT_FOUND"
   *                             reason:
   *                               type: string
   *                               example: "App version with ID 123e4567-e89b-12d3-a456-426614174000 not found"
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/app-versions/:id',
    authenticate,
    (req, res, next) => appVersionAdminController.getAppVersion(req, res, next)
  );

  /**
   * @swagger
   * /admin/app-versions/app/{appId}:
   *   get:
   *     tags: [Admin]
   *     summary: Get all app versions for an app
   *     description: Gets all app versions for an app, ordered by platform and creation date (descending)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *         description: App ID
   *         example: "com.vimbisopay.app"
   *     responses:
   *       200:
   *         description: App versions found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App versions found"
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
   *                         details:
   *                           type: object
   *                           properties:
   *                             versions:
   *                               type: array
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   id:
   *                                     type: string
   *                                     example: "123e4567-e89b-12d3-a456-426614174000"
   *                                   appId:
   *                                     type: string
   *                                     example: "com.vimbisopay.app"
   *                                   platform:
   *                                     type: string
   *                                     example: "android"
   *                                   version:
   *                                     type: string
   *                                     example: "1.1.0"
   *                                   minRequiredVersion:
   *                                     type: string
   *                                     example: "1.0.0"
   *                                   updateUrl:
   *                                     type: string
   *                                     example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk"
   *                                   fileSizeBytes:
   *                                     type: number
   *                                     example: 15728640
   *                                   releaseNotes:
   *                                     type: string
   *                                     example: "Bug fixes and performance improvements"
   *                                   releaseDate:
   *                                     type: string
   *                                     example: "2025-03-15T00:00:00Z"
   *                                   updatePriority:
   *                                     type: string
   *                                     example: "medium"
   *                                   updateType:
   *                                     type: string
   *                                     example: "patch"
   *                                   active:
   *                                     type: boolean
   *                                     example: true
   *                                   checksumAlgorithm:
   *                                     type: string
   *                                     description: Hash algorithm used for checksums
   *                                     example: "sha256"
   *                                   checksumUniversal:
   *                                     type: string
   *                                     description: Checksum of the universal APK
   *                                     example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   *                                   checksumArm64:
   *                                     type: string
   *                                     description: Checksum of the ARM64 APK
   *                                     example: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1"
   *                                   checksumArm:
   *                                     type: string
   *                                     description: Checksum of the ARM APK
   *                                     example: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2"
   *                                   checksumX86_64:
   *                                     type: string
   *                                     description: Checksum of the x86_64 APK
   *                                     example: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3"
   *                                   checksumUrl:
   *                                     type: string
   *                                     description: URL to download the checksums file
   *                                     example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-checksums.txt"
   *                                   architectureSpecificDownloads:
   *                                     type: object
   *                                     description: Architecture-specific download URLs
   *                                     properties:
   *                                       arm64-v8a:
   *                                         type: string
   *                                         description: URL to download the ARM64 APK
   *                                         example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm64.apk"
   *                                       armeabi-v7a:
   *                                         type: string
   *                                         description: URL to download the ARM APK
   *                                         example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm.apk"
   *                                       x86_64:
   *                                         type: string
   *                                         description: URL to download the x86_64 APK
   *                                         example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-x86_64.apk"
   *                                   createdAt:
   *                                     type: string
   *                                     format: date-time
   *                                   updatedAt:
   *                                     type: string
   *                                     format: date-time
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/app-versions/app/:appId',
    authenticate,
    (req, res, next) => appVersionAdminController.getAppVersions(req, res, next)
  );

  /**
   * @swagger
   * /admin/app-versions/{id}:
   *   put:
   *     tags: [Admin]
   *     summary: Update an app version
   *     description: |
   *       Updates an app version. When a version is updated with `active: true`, 
   *       all other versions for the same app and platform are automatically set to inactive.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: App version ID
   *         example: "123e4567-e89b-12d3-a456-426614174000"
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
   *                 example: "1.1.1"
   *               minRequiredVersion:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Minimum required version (e.g., 1.0.0 or 1.0.0+33)
   *                 example: "1.0.0"
   *               updateUrl:
   *                 type: string
   *                 description: URL to download the update
   *                 example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.1.apk"
   *               fileSizeBytes:
   *                 type: number
   *                 description: Size of the update file in bytes
   *                 example: 15728640
   *               releaseNotes:
   *                 type: string
   *                 description: Notes about the update
   *                 example: "Bug fixes and performance improvements"
   *               releaseDate:
   *                 type: string
   *                 format: date-time
   *                 description: Date the update was released (ISO 8601 format)
   *                 example: "2025-03-15T00:00:00Z"
   *               updatePriority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *                 description: Priority of the update
   *                 example: "medium"
   *               updateType:
   *                 type: string
   *                 enum: [patch, minor, major]
   *                 description: Type of update
   *                 example: "patch"
   *               active:
   *                 type: boolean
   *                 description: Whether the version is active
   *                 example: true
   *               checksumAlgorithm:
   *                 type: string
   *                 description: Hash algorithm used for checksums
   *                 example: "sha256"
   *               checksumUniversal:
   *                 type: string
   *                 description: Checksum of the universal APK
   *                 example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   *               checksumArm64:
   *                 type: string
   *                 description: Checksum of the ARM64 APK
   *                 example: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1"
   *               checksumArm:
   *                 type: string
   *                 description: Checksum of the ARM APK
   *                 example: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2"
   *               checksumX86_64:
   *                 type: string
   *                 description: Checksum of the x86_64 APK
   *                 example: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3"
   *               checksumUrl:
   *                 type: string
   *                 description: URL to download the checksums file
   *                 example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-checksums.txt"
   *               architectureSpecificDownloads:
   *                 type: object
   *                 description: Architecture-specific download URLs
   *                 properties:
   *                   arm64-v8a:
   *                     type: string
   *                     description: URL to download the ARM64 APK
   *                     example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm64.apk"
   *                   armeabi-v7a:
   *                     type: string
   *                     description: URL to download the ARM APK
   *                     example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm.apk"
   *                   x86_64:
   *                     type: string
   *                     description: URL to download the x86_64 APK
   *                     example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-x86_64.apk"
   *     responses:
   *       200:
   *         description: App version updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App version updated successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "123e4567-e89b-12d3-a456-426614174000"
   *                         type:
   *                           type: string
   *                           example: "APP_VERSION_CHECK"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                               example: "123e4567-e89b-12d3-a456-426614174000"
   *                             appId:
   *                               type: string
   *                               example: "com.vimbisopay.app"
   *                             platform:
   *                               type: string
   *                               example: "android"
   *                             version:
   *                               type: string
   *                               example: "1.1.1"
   *                             minRequiredVersion:
   *                               type: string
   *                               example: "1.0.0"
   *                             updateUrl:
   *                               type: string
   *                               example: "https://downloads.vimbisopay.com/app/vimbisopay-1.1.1.apk"
   *                             fileSizeBytes:
   *                               type: number
   *                               example: 15728640
   *                             releaseNotes:
   *                               type: string
   *                               example: "Bug fixes and performance improvements"
   *                             releaseDate:
   *                               type: string
   *                               example: "2025-03-15T00:00:00Z"
   *                             updatePriority:
   *                               type: string
   *                               example: "medium"
   *                             updateType:
   *                               type: string
   *                               example: "patch"
   *                             active:
   *                               type: boolean
   *                               example: true
   *                             checksumAlgorithm:
   *                               type: string
   *                               description: Hash algorithm used for checksums
   *                               example: "sha256"
   *                             checksumUniversal:
   *                               type: string
   *                               description: Checksum of the universal APK
   *                               example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   *                             checksumArm64:
   *                               type: string
   *                               description: Checksum of the ARM64 APK
   *                               example: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1"
   *                             checksumArm:
   *                               type: string
   *                               description: Checksum of the ARM APK
   *                               example: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2"
   *                             checksumX86_64:
   *                               type: string
   *                               description: Checksum of the x86_64 APK
   *                               example: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3"
   *                             checksumUrl:
   *                               type: string
   *                               description: URL to download the checksums file
   *                               example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-checksums.txt"
   *                             architectureSpecificDownloads:
   *                               type: object
   *                               description: Architecture-specific download URLs
   *                               properties:
   *                                 arm64-v8a:
   *                                   type: string
   *                                   description: URL to download the ARM64 APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm64.apk"
   *                                 armeabi-v7a:
   *                                   type: string
   *                                   description: URL to download the ARM APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-arm.apk"
   *                                 x86_64:
   *                                   type: string
   *                                   description: URL to download the x86_64 APK
   *                                   example: "https://github.com/Great-Sun-Group/vimbisopay/releases/download/v2.1.0+01/vimbisopay-2.1.0+01-x86_64.apk"
   *                             createdAt:
   *                               type: string
   *                               format: date-time
   *                             updatedAt:
   *                               type: string
   *                               format: date-time
   *       404:
   *         description: App version not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App version not found"
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
   *                           example: "ERROR_NOT_FOUND"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: "NOT_FOUND"
   *                             reason:
   *                               type: string
   *                               example: "App version with ID 123e4567-e89b-12d3-a456-426614174000 not found"
   *       500:
   *         description: Internal server error
   */
  router.put(
    '/app-versions/:id',
    authenticate,
    validateRequest(updateAppVersionSchema),
    (req, res, next) => appVersionAdminController.updateAppVersion(req, res, next)
  );

  /**
   * @swagger
   * /admin/app-versions/{id}:
   *   delete:
   *     tags: [Admin]
   *     summary: Delete an app version
   *     description: Deletes an app version by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: App version ID
   *         example: "123e4567-e89b-12d3-a456-426614174000"
   *     responses:
   *       200:
   *         description: App version deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App version deleted successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "123e4567-e89b-12d3-a456-426614174000"
   *                         type:
   *                           type: string
   *                           example: "APP_VERSION_CHECK"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                               example: "123e4567-e89b-12d3-a456-426614174000"
   *       404:
   *         description: App version not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "App version not found"
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
   *                           example: "ERROR_NOT_FOUND"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: "NOT_FOUND"
   *                             reason:
   *                               type: string
   *                               example: "App version with ID 123e4567-e89b-12d3-a456-426614174000 not found"
   *       500:
   *         description: Internal server error
   */
  router.delete(
    '/app-versions/:id',
    authenticate,
    (req, res, next) => appVersionAdminController.deleteAppVersion(req, res, next)
  );

  return router;
}
