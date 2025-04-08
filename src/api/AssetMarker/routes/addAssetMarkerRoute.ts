import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { addAssetMarkerSchema } from "../assetMarkerValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { AddAssetMarkerController } from "../controllers";

export default function addAssetMarkerRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /addAssetMarker:
   *   post:
   *     tags: [AssetMarker]
   *     summary: Create a new asset marker
   *     description: Creates a new asset marker in the system with optional metadata and S3 key
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - assetName
   *               - crAccounts
   *               - drAccounts
   *             properties:
   *               assetName:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 100
   *                 description: Name of the asset
   *               crAccounts:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required:
   *                     - accountID
   *                     - amount
   *                   properties:
   *                     accountID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the account to credit
   *                     amount:
   *                       type: number
   *                       minimum: 0
   *                       exclusiveMinimum: true
   *                       description: Amount to credit
   *               drAccounts:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required:
   *                     - accountID
   *                     - amount
   *                   properties:
   *                     accountID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the account to debit
   *                     amount:
   *                       type: number
   *                       minimum: 0
   *                       exclusiveMinimum: true
   *                       description: Amount to debit
   *               denomination:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU]
   *                 default: USD
   *                 description: Denomination of the asset marker
   *               description:
   *                 type: string
   *                 maxLength: 500
   *                 description: Detailed description of the asset
   *               s3Key:
   *                 type: string
   *                 description: Key to access data stored in S3 bucket
   *               AssetMarkerData:
   *                 type: object
   *                 description: Additional metadata for the asset marker (up to 2kb)
   *     responses:
   *       201:
   *         description: Asset marker created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Asset marker created successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The created asset marker ID
   *                         type:
   *                           type: string
   *                           enum: [ASSET_MARKER_CREATED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who created the asset marker
   *                         details:
   *                           type: object
   *                           properties:
   *                             assetIDs:
   *                               type: array
   *                               items:
   *                                 type: string
   *                                 format: uuid
   *                               description: Array of created asset marker IDs
   *                             GLid:
   *                               type: string
   *                               description: General Ledger ID shared by all created asset markers
   *                             assetName:
   *                               type: string
   *                             description:
   *                               type: string
   *                             s3Key:
   *                               type: string
   *                             denomination:
   *                               type: string
   *                             createdAt:
   *                               type: string
   *                               format: date-time
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
   *                   example: Invalid asset name
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
   *                               example: INVALID_ASSET_NAME
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
   *         description: Not authorized to create asset markers
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Vendor status required to create asset markers
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
   *       413:
   *         description: Asset marker data too large
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Asset marker data exceeds maximum size of 2kb
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
   *                               example: DATA_TOO_LARGE
   *                             reason:
   *                               type: string
   *                             dataSize:
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
   *                   example: Internal server error while creating asset marker
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
    `/addAssetMarker`,
    validateRequest(addAssetMarkerSchema),
    authenticatedHandler(AddAssetMarkerController),
    errorHandler
  );
  logger.debug("Route registered: POST /addAssetMarker");

  return router;
}
