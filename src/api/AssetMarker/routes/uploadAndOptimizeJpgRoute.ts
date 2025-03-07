import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { uploadAndOptimizeJpgSchema } from "../assetMarkerValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { UploadAndOptimizeJpgController } from "../controllers";

export default function uploadAndOptimizeJpgRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /uploadAndOptimizeJpg:
   *   post:
   *     tags: [AssetMarker]
   *     summary: Upload and optimize a JPG image
   *     description: Uploads a JPG image, optimizes it, and creates the necessary asset markers and relationships
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - jpg
   *               - name
   *               - drAccountID
   *             properties:
   *               jpg:
   *                 type: string
   *                 format: binary
   *                 description: JPG image file to upload
   *               name:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 100
   *                 description: Name for the asset
   *               drAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to debit (DR)
   *               crAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to credit (CR). If not provided, defaults to "Onboarded Assets" account.
   *     responses:
   *       201:
   *         description: Image uploaded and optimized successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Image uploaded and optimized successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The created original asset marker ID
   *                         type:
   *                           type: string
   *                           enum: [IMAGE_UPLOADED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who uploaded the image
   *                         details:
   *                           type: object
   *                           properties:
   *                             originalAssetID:
   *                               type: string
   *                               format: uuid
   *                             asset200ID:
   *                               type: string
   *                               format: uuid
   *                             asset600ID:
   *                               type: string
   *                               format: uuid
   *                             assetName:
   *                               type: string
   *                             drAccountID:
   *                               type: string
   *                               format: uuid
   *                             crAccountID:
   *                               type: string
   *                               format: uuid
   *                     dashboard:
   *                       type: object
   *                       description: Current state of the member dashboard
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invalid image format. Only JPG is supported.
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INVALID_IMAGE_FORMAT
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Authentication required
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_UNAUTHORIZED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: system
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: NO_AUTH
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       403:
   *         description: Not authorized to upload images
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Vendor status required to upload images
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_UNAUTHORIZED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: VENDOR_REQUIRED
   *                             reason:
   *                               type: string
   *                             suggestion:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       404:
   *         description: Account not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account not found
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_NOT_FOUND]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: ACCOUNT_NOT_FOUND
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       413:
   *         description: Image too large
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Image exceeds maximum size of 10MB
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: IMAGE_TOO_LARGE
   *                             reason:
   *                               type: string
   *                             imageSize:
   *                               type: number
   *                             maxSize:
   *                               type: number
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error while uploading image
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_INTERNAL]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INTERNAL_ERROR
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   */
  router.post(
    `/uploadAndOptimizeJpg`,
    validateRequest(uploadAndOptimizeJpgSchema),
    authenticatedHandler(UploadAndOptimizeJpgController),
    errorHandler
  );
  logger.debug("Route registered: POST /uploadAndOptimizeJpg");

  return router;
}
