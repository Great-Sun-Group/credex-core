import express from 'express';
import multer from 'multer';
import { DeploymentController } from '../controllers/deploymentController';
import { validateRequest } from '../../../middleware/validateRequest';
import { 
  deployServiceSchema, 
  uploadApkSchema, 
  updateAppVersionSchema 
} from '../deploymentValidationSchemas';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for APK files
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Accept APK files
    if (file.mimetype === 'application/vnd.android.package-archive' || 
        file.originalname.endsWith('.apk')) {
      cb(null, true);
    } else {
      cb(new Error('Only APK files are allowed'));
    }
  }
});

export default function deploymentRoutes() {
  const router = express.Router();
  const controller = new DeploymentController();

  /**
   * @swagger
   * /api/deploy-core:
   *   post:
   *     tags: [Deployment]
   *     summary: Deploy credex-core service
   *     description: |
   *       Deploys the credex-core service by pulling latest changes from the repository,
   *       building the application, and restarting the Docker container.
   *       Requires a valid deployment token for authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - service
   *               - deploy_token
   *             properties:
   *               service:
   *                 type: string
   *                 enum: [credex-core]
   *                 description: Service to deploy
   *                 example: "credex-core"
   *               deploy_token:
   *                 type: string
   *                 description: Deployment authentication token
   *                 example: "your-secure-deploy-token-here"
   *               branch:
   *                 type: string
   *                 enum: [prod, main]
   *                 description: Git branch to deploy (defaults to prod)
   *                 example: "prod"
   *               commit_sha:
   *                 type: string
   *                 pattern: ^[a-f0-9]{40}$
   *                 description: Specific commit SHA to deploy (optional)
   *                 example: "a1b2c3d4e5f6789012345678901234567890abcd"
   *     responses:
   *       200:
   *         description: Deployment successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "credex-core deployed successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "req-123"
   *                         type:
   *                           type: string
   *                           example: "DEPLOY_CORE_SUCCESS"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: "deployment-system"
   *                         details:
   *                           type: object
   *                           properties:
   *                             deploymentId:
   *                               type: string
   *                               example: "credex-core-1643723400000"
   *                             branch:
   *                               type: string
   *                               example: "prod"
   *                             commitSha:
   *                               type: string
   *                               example: "a1b2c3d4e5f6789012345678901234567890abcd"
   *                             timestamp:
   *                               type: string
   *                               format: date-time
   *       401:
   *         description: Invalid deployment token
   *       500:
   *         description: Deployment failed
   */
  router.post(
    '/deploy-core',
    validateRequest(deployServiceSchema),
    controller.deployCore
  );

  /**
   * @swagger
   * /api/deploy-chatserver:
   *   post:
   *     tags: [Deployment]
   *     summary: Deploy vimbiso-chatserver service
   *     description: |
   *       Deploys the vimbiso-chatserver service by pulling latest changes from the repository
   *       and restarting the Docker container.
   *       Requires a valid deployment token for authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - service
   *               - deploy_token
   *             properties:
   *               service:
   *                 type: string
   *                 enum: [vimbiso-chatserver]
   *                 description: Service to deploy
   *                 example: "vimbiso-chatserver"
   *               deploy_token:
   *                 type: string
   *                 description: Deployment authentication token
   *                 example: "your-secure-deploy-token-here"
   *               branch:
   *                 type: string
   *                 enum: [prod, main]
   *                 description: Git branch to deploy (defaults to prod)
   *                 example: "prod"
   *               commit_sha:
   *                 type: string
   *                 pattern: ^[a-f0-9]{40}$
   *                 description: Specific commit SHA to deploy (optional)
   *                 example: "a1b2c3d4e5f6789012345678901234567890abcd"
   *     responses:
   *       200:
   *         description: Deployment successful
   *       401:
   *         description: Invalid deployment token
   *       500:
   *         description: Deployment failed
   */
  router.post(
    '/deploy-chatserver',
    validateRequest(deployServiceSchema),
    controller.deployChatserver
  );

  /**
   * @swagger
   * /api/upload-apk:
   *   post:
   *     tags: [Deployment]
   *     summary: Upload mobile app APK
   *     description: |
   *       Uploads a new APK file for the mobile application, stores it locally,
   *       and updates the app version database with the new version information.
   *       The version number is auto-incremented based on whether the update is required.
   *     consumes:
   *       - multipart/form-data
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - apk_file
   *               - version
   *               - update_required
   *               - release_notes
   *               - deploy_token
   *             properties:
   *               apk_file:
   *                 type: string
   *                 format: binary
   *                 description: APK file to upload
   *               version:
   *                 type: string
   *                 pattern: ^\d+\.\d+\.\d+(\+\d+)?$
   *                 description: Version number (e.g., 1.2.3 or 1.2.3+45)
   *                 example: "1.2.3"
   *               update_required:
   *                 type: boolean
   *                 description: Whether this update is required for users
   *                 example: false
   *               release_notes:
   *                 type: string
   *                 maxLength: 1000
   *                 description: Release notes for this version
   *                 example: "Bug fixes and performance improvements"
   *               deploy_token:
   *                 type: string
   *                 description: Deployment authentication token
   *                 example: "your-secure-deploy-token-here"
   *     responses:
   *       200:
   *         description: APK uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "APK uploaded successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "req-123"
   *                         type:
   *                           type: string
   *                           example: "UPLOAD_APK_SUCCESS"
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: "deployment-system"
   *                         details:
   *                           type: object
   *                           properties:
   *                             uploadId:
   *                               type: string
   *                               example: "apk-upload-1643723400000"
   *                             version:
   *                               type: string
   *                               example: "1.2.3"
   *                             filename:
   *                               type: string
   *                               example: "vimbisopay-1.2.3.apk"
   *                             fileSizeBytes:
   *                               type: number
   *                               example: 15728640
   *                             checksum:
   *                               type: string
   *                               example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   *                             downloadUrl:
   *                               type: string
   *                               example: "/downloads/vimbisopay-1.2.3.apk"
   *                             latestDownloadUrl:
   *                               type: string
   *                               example: "/downloads/vimbisopay-latest.apk"
   *                             updateRequired:
   *                               type: boolean
   *                               example: false
   *                             releaseNotes:
   *                               type: string
   *                               example: "Bug fixes and performance improvements"
   *                             timestamp:
   *                               type: string
   *                               format: date-time
   *       400:
   *         description: Invalid APK file or missing parameters
   *       401:
   *         description: Invalid deployment token
   *       500:
   *         description: Upload failed
   */
  router.post(
    '/upload-apk',
    upload.single('apk_file'),
    validateRequest(uploadApkSchema),
    controller.uploadApk
  );

  /**
   * @swagger
   * /downloads/vimbisopay-{version}.apk:
   *   get:
   *     tags: [Deployment]
   *     summary: Download APK file
   *     description: |
   *       Downloads the APK file for a specific version or the latest version.
   *       This endpoint serves the APK files that were uploaded via the upload-apk endpoint.
   *     parameters:
   *       - in: path
   *         name: version
   *         required: true
   *         schema:
   *           type: string
   *         description: Version number or 'latest' for the most recent version
   *         example: "1.2.3"
   *     responses:
   *       200:
   *         description: APK file download
   *         content:
   *           application/vnd.android.package-archive:
   *             schema:
   *               type: string
   *               format: binary
   *         headers:
   *           Content-Disposition:
   *             description: Attachment filename
   *             schema:
   *               type: string
   *               example: 'attachment; filename="vimbisopay-1.2.3.apk"'
   *       404:
   *         description: APK file not found
   */
  router.get('/downloads/vimbisopay-:version.apk', controller.downloadApk);

  // Note: /app/version-check endpoint is maintained in the App module for backward compatibility
  // During the transition period, both endpoints coexist to ensure no service disruption
  // See src/api/Deployment/BACKWARD_COMPATIBILITY.md for migration strategy

  return router;
}
