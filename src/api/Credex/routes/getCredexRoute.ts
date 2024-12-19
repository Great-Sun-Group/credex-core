import express from "express";
import { GetCredexController } from "../controllers/getCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { getCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function getCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Get Credex transaction details
   *     description: Retrieves detailed information about a specific Credex transaction, including its current state, amounts, and clearing information.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *               - accountID
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the Credex to retrieve
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account requesting the Credex details
   *     responses:
   *       200:
   *         description: Credex details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Credex details retrieved successfully"
   *                   description: Human-friendly message describing the action
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The credexID of the transaction
   *                         type:
   *                           type: string
   *                           enum: [CREDEX_RETRIEVED]
   *                           description: Business action type
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: MemberID/AccountID who performed the action
   *                         details:
   *                           type: object
   *                           properties:
   *                             transactionType:
   *                               type: string
   *                               enum: [OWES, CLEARED, REQUESTS, OFFERS, DECLINED, CANCELLED]
   *                             InitialAmount:
   *                               type: number
   *                               description: Initial amount of the transaction
   *                             securedCredex:
   *                               type: boolean
   *                               description: Whether this is a secured Credex
   *                             counterpartyAccountName:
   *                               type: string
   *                               description: Name of the counterparty account
   *                     dashboard:
   *                       type: object
   *                       description: Full dashboard state after the action
   *                       properties:
   *                         memberID:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the authenticated member
   *                         memberTier:
   *                           type: integer
   *                           description: Current membership tier level
   *                         remainingAvailableUSD:
   *                           type: number
   *                           description: Available USD for transactions (optional, n/a for memberTier>=3)
   *                         firstname:
   *                           type: string
   *                           description: Member's first name
   *                         lastname:
   *                           type: string
   *                           description: Member's last name
   *                         memberHandle:
   *                           type: string
   *                           description: Member's handle
   *                         defaultDenom:
   *                           type: string
   *                           description: Member's default denomination
   *                         accounts:
   *                           type: array
   *                           description: List of accounts accessible to the member
   *                           items:
   *                             type: object
   *                             properties:
   *                               accountID:
   *                                 type: string
   *                                 format: uuid
   *                               accountName:
   *                                 type: string
   *                               accountHandle:
   *                                 type: string
   *                               accountType:
   *                                 type: string
   *                                 enum: [PERSONAL, BUSINESS, CREDEX_FOUNDATION, TRUST, OPERATIONS]
   *                                 description: Type of the account
   *                               defaultDenom:
   *                                 type: string
   *                                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                               isOwnedAccount:
   *                                 type: boolean
   *                                 description: Whether the member owns this account
   *                               sendOffersTo:
   *                                 type: object
   *                                 description: Member configured to receive offers for this account
   *                                 properties:
   *                                   memberID:
   *                                     type: string
   *                                     format: uuid
   *                                   firstname:
   *                                     type: string
   *                                   lastname:
   *                                     type: string
   *                               balanceData:
   *                                 type: object
   *                                 description: Account balance information
   *                                 properties:
   *                                   securedNetBalancesByDenom:
   *                                     type: array
   *                                     items:
   *                                       type: string
   *                                       description: Formatted balance with denomination (e.g. "100.00 USD")
   *                                   unsecuredBalancesInDefaultDenom:
   *                                     type: object
   *                                     properties:
   *                                       totalPayables:
   *                                         type: string
   *                                         description: Total payables in account default denomination
   *                                       totalReceivables:
   *                                         type: string
   *                                         description: Total receivables in account default denomination
   *                                       netPayRec:
   *                                         type: string
   *                                         description: Net payables/receivables in account default denomination
   *                                   netCredexAssetsInDefaultDenom:
   *                                     type: string
   *                                     description: Net credex assets in account default denomination
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Invalid input parameters"
   *                   description: Human-friendly error message
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
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
   *                               enum: [VALIDATION_ERROR]
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Authentication required"
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
   *                           enum: [system]
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               enum: [UNAUTHORIZED]
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       403:
   *         description: Not authorized to view this Credex
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Not authorized to view this Credex"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
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
   *                               enum: [FORBIDDEN]
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       404:
   *         description: Credex not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Credex not found"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
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
   *                               enum: [NOT_FOUND]
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Internal server error"
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
   *                           enum: [system]
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               enum: [INTERNAL_ERROR]
   *                             reason:
   *                               type: string
   *                             suggestion:
   *                               type: string
   *                     dashboard:
   *                       type: object
   */
  router.post(
    `/getCredex`,
    validateRequest(getCredexSchema),
    authenticatedHandler(GetCredexController)
  );
  logger.debug("Route registered: POST /getCredex");

  return router;
}
