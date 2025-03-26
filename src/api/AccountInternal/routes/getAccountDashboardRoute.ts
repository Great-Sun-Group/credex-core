import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getAccountDashboardSchema } from "../accountInternalValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GetAccountDashboardController } from "../controllers/GetAccountDashboardController";

export default function getAccountDashboardRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getAccountDashboard/{accountID}:
   *   get:
   *     tags: [AccountInternal]
   *     summary: Get account dashboard information
   *     description: Retrieve account details, balances, transaction history, and related product accounts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the account to retrieve dashboard for
   *     responses:
   *       200:
   *         description: Account dashboard retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account dashboard retrieved successfully
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
   *                           enum: [ACCOUNT_DASHBOARD_RETRIEVED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who retrieved the dashboard
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
   *                         balances:
   *                           type: object
   *                           properties:
   *                             totalCredits:
   *                               type: number
   *                               description: Total credits in the account
   *                             totalDebits:
   *                               type: number
   *                               description: Total debits in the account
   *                             netBalance:
   *                               type: number
   *                               description: Net balance of the account
   *                         transactions:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               transactionID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the transaction
   *                               amount:
   *                                 type: number
   *                                 description: Amount of the transaction
   *                               denomination:
   *                                 type: string
   *                                 description: Denomination of the transaction
   *                               type:
   *                                 type: string
   *                                 enum: [Credit, Debit]
   *                                 description: Type of the transaction
   *                               counterparty:
   *                                 type: object
   *                                 properties:
   *                                   accountID:
   *                                     type: string
   *                                     format: uuid
   *                                     description: ID of the counterparty account
   *                                   accountName:
   *                                     type: string
   *                                     description: Name of the counterparty account
   *                               createdAt:
   *                                 type: string
   *                                 format: date-time
   *                                 description: When the transaction occurred
   *                               description:
   *                                 type: string
   *                                 description: Description of the transaction
   *                         relatedProducts:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               productID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the product
   *                               productName:
   *                                 type: string
   *                                 description: Name of the product
   *                               productDescription:
   *                                 type: string
   *                                 description: Description of the product
   *                               productHandle:
   *                                 type: string
   *                                 description: Handle of the product
   *                               thumbnailPicID:
   *                                 type: string
   *                                 format: uuid
   *                                 nullable: true
   *                                 description: ID of the thumbnail picture for the product
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
   *                   example: Internal server error while retrieving account dashboard
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
    `/getAccountDashboard/:accountID`,
    validateRequest(getAccountDashboardSchema, "params"),
    authenticatedHandler(GetAccountDashboardController),
    errorHandler
  );
  logger.debug("Route registered: GET /getAccountDashboard/:accountID");

  return router;
}
