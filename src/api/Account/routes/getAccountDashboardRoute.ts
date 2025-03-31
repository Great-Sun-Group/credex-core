import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getAccountDashboardSchema } from "../accountValidationSchemas";
import { authMiddleware } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GetAccountDashboardController } from "../controllers/getAccountDashboardController";

export default function getAccountDashboardRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getAccountDashboard/{accountID}:
   *   get:
   *     tags: [Accounts]
   *     summary: Get account dashboard information
   *     description: Retrieve account details, balances, and authorized members
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the account to retrieve dashboard information for
   *     responses:
   *       200:
   *         description: Account dashboard information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account dashboard information retrieved successfully
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
   *                           description: ID of the member who retrieved the information
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
   *                             accountType:
   *                               type: string
   *                               description: Type of the account
   *                             defaultDenom:
   *                               type: string
   *                               description: Default denomination of the account
   *                             isOwnedAccount:
   *                               type: boolean
   *                               description: Whether the account is owned by the member
   *                             profilePictureUrls:
   *                               type: object
   *                               properties:
   *                                 original:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the original profile picture
   *                                 thumbnail:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the thumbnail profile picture
   *                                 pic200:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the 200px profile picture
   *                                 pic600:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the 600px profile picture
   *                             sendOffersTo:
   *                               type: object
   *                               nullable: true
   *                               properties:
   *                                 memberID:
   *                                   type: string
   *                                   format: uuid
   *                                   description: ID of the member to send offers to
   *                                 firstname:
   *                                   type: string
   *                                   description: First name of the member
   *                                 lastname:
   *                                   type: string
   *                                   description: Last name of the member
   *                         balances:
   *                           type: object
   *                           properties:
   *                             securedNetBalancesByDenom:
   *                               type: array
   *                               items:
   *                                 type: string
   *                               description: Secured net balances by denomination
   *                             unsecuredBalancesInDefaultDenom:
   *                               type: object
   *                               properties:
   *                                 totalPayables:
   *                                   type: string
   *                                   description: Total payables in default denomination
   *                                 totalReceivables:
   *                                   type: string
   *                                   description: Total receivables in default denomination
   *                                 netPayRec:
   *                                   type: string
   *                                   description: Net payables/receivables in default denomination
   *                             netCredexAssetsInDefaultDenom:
   *                               type: string
   *                               description: Net credex assets in default denomination
   *                         pendingInData:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               credexID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the credex
   *                               amount:
   *                                 type: number
   *                                 description: Amount of the credex
   *                               denomination:
   *                                 type: string
   *                                 description: Denomination of the credex
   *                               credexType:
   *                                 type: string
   *                                 description: Type of the credex
   *                               createdAt:
   *                                 type: string
   *                                 format: date-time
   *                                 description: When the credex was created
   *                         pendingOutData:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               credexID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the credex
   *                               amount:
   *                                 type: number
   *                                 description: Amount of the credex
   *                               denomination:
   *                                 type: string
   *                                 description: Denomination of the credex
   *                               credexType:
   *                                 type: string
   *                                 description: Type of the credex
   *                               createdAt:
   *                                 type: string
   *                                 format: date-time
   *                                 description: When the credex was created
   *                         authorizedMembers:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               memberID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the authorized member
   *                               firstname:
   *                                 type: string
   *                                 description: First name of the authorized member
   *                               lastname:
   *                                 type: string
   *                                 description: Last name of the authorized member
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
   *       403:
   *         description: Unauthorized access
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: You are not authorized to view this account
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
   *                               example: UNAUTHORIZED
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
   *                   example: No account found with ID
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
   *                   example: Internal server error while retrieving account dashboard information
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
    authMiddleware(),
    GetAccountDashboardController,
    errorHandler
  );
  logger.debug("Route registered: GET /getAccountDashboard/:accountID");

  return router;
}
