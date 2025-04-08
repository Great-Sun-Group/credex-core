import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getAccountInternalDataSchema } from "../accountInternalValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GetAccountInternalDataController } from "../controllers/GetAccountInternalDataController";

export default function getAccountInternalDataRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getAccountInternalData/{accountID}:
   *   get:
   *     tags: [AccountInternal]
   *     summary: Get detailed account internal data
   *     description: Retrieve detailed account information for public view, product details, and media
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the account to retrieve data for
   *     responses:
   *       200:
   *         description: Account internal data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account internal data retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The account ID
   *                         type:
   *                           type: string
   *                           enum: [ACCOUNT_INTERNAL_DATA_RETRIEVED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who retrieved the data
   *                         details:
   *                           type: object
   *                           properties:
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the account
   *                             accountName:
   *                               type: string
   *                               description: Name of the account
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         account:
   *                           type: object
   *                           properties:
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the account
   *                             accountName:
   *                               type: string
   *                               description: Name of the account
   *                             accountHandle:
   *                               type: string
   *                               description: Handle of the account
   *                             accountDescription:
   *                               type: string
   *                               description: Description of the account
   *                             accountType:
   *                               type: string
   *                               enum: [CONSUMPTION, PRODUCTION, DIGITAL_ASSET, PHYSICAL_ASSET]
   *                               description: Type of the account
   *                             storeOpen:
   *                               type: boolean
   *                               description: Whether the store is open (if applicable)
   *                             location:
   *                               type: object
   *                               nullable: true
   *                               properties:
   *                                 latitude:
   *                                   type: number
   *                                   format: float
   *                                   description: Latitude coordinate of the store
   *                                 longitude:
   *                                   type: number
   *                                   format: float
   *                                   description: Longitude coordinate of the store
   *                             owner:
   *                               type: object
   *                               nullable: true
   *                               properties:
   *                                 memberID:
   *                                   type: string
   *                                   format: uuid
   *                                   description: ID of the member who owns the account
   *                                 firstname:
   *                                   type: string
   *                                   description: First name of the owner
   *                                 lastname:
   *                                   type: string
   *                                   description: Last name of the owner
   *                                 memberHandle:
   *                                   type: string
   *                                   description: Handle of the owner
   *                             profilePictures:
   *                               type: object
   *                               properties:
   *                                 original:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the original profile picture
   *                                 thumbnail:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the thumbnail profile picture
   *                                 pic200:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the 200px profile picture
   *                                 pic600:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the 600px profile picture
   *                         productDetails:
   *                           type: object
   *                           nullable: true
   *                           properties:
   *                             attributes:
   *                               type: array
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   name:
   *                                     type: string
   *                                     description: Name of the attribute
   *                                   value:
   *                                     type: string
   *                                     description: Value of the attribute
   *                         media:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               assetID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the media asset
   *                               assetType:
   *                                 type: string
   *                                 description: Type of the media asset
   *                               relationshipType:
   *                                 type: string
   *                                 description: Type of relationship between account and media
   *                               url:
   *                                 type: string
   *                                 nullable: true
   *                                 description: URL of the media asset
   *                               createdAt:
   *                                 type: string
   *                                 format: date-time
   *                                 description: When the media asset was created
   *                         isOwner:
   *                           type: boolean
   *                           description: Whether the requesting member owns the account
   *       400:
   *         description: Invalid input parameters
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invalid input parameters
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
   *                               example: VALIDATION_ERROR
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
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error while retrieving account internal data
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
  router.get(
    `/getAccountInternalData/:accountID`,
    validateRequest(getAccountInternalDataSchema, "params"),
    authenticatedHandler(GetAccountInternalDataController),
    errorHandler
  );
  logger.debug("Route registered: GET /getAccountInternalData/:accountID");

  return router;
}
