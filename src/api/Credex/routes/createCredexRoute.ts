import express from "express";
import { CreateCredexController } from "../controllers/createCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { createCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function createCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /createCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Create a new Credex transaction
   *     description: Creates a new Credex transaction between two accounts with optional security and due date. Requires authentication.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - issuerAccountID
   *               - receiverAccountID
   *               - Denomination
   *               - InitialAmount
   *               - credexType
   *               - OFFERSorREQUESTS
   *               - securedCredex
   *             properties:
   *               issuerAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account issuing the Credex
   *               receiverAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account receiving the Credex
   *               Denomination:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Denomination of the transaction
   *               InitialAmount:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *                 description: Amount of the transaction
   *               credexType:
   *                 type: string
   *                 enum: [PURCHASE, GIFT, DCO_GIVE, DCO_RECEIVE]
   *                 description: Type of Credex transaction
   *               OFFERSorREQUESTS:
   *                 type: string
   *                 enum: [OFFERS, REQUESTS]
   *                 description: Whether this is an offer or request
   *               securedCredex:
   *                 type: boolean
   *                 description: Whether this Credex is secured
   *               dueDate:
   *                 type: string
   *                 format: date
   *                 pattern: ^\d{4}-\d{2}-\d{2}$
   *                 description: Optional due date for unsecured Credex
   *     responses:
   *       200:
   *         description: Credex created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Secured credex for $2.58 USD offered to Vimbisopay: Trust."
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
   *                           description: The credexID of the created transaction
   *                         type:
   *                           type: string
   *                           enum: [CREDEX_CREATED]
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
   *                             credexID:
   *                               type: string
   *                               format: uuid
   *                             amount:
   *                               type: string
   *                               description: Formatted amount with denomination
   *                             denomination:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU, ZWG]
   *                             securedCredex:
   *                               type: boolean
   *                             receiverAccountID:
   *                               type: string
   *                               format: uuid
   *                             receiverAccountName:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Current state of the account dashboard
   *                       properties:
   *                         member:
   *                           type: object
   *                           description: Member-level dashboard data
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the authenticated member
   *                             memberTier:
   *                               type: integer
   *                               description: Current membership tier level
   *                             remainingAvailableUSD:
   *                               type: number
   *                               description: Available USD for transactions (optional, n/a for memberTier>=3)
   *                             firstname:
   *                               type: string
   *                               description: Member's first name
   *                             lastname:
   *                               type: string
   *                               description: Member's last name
   *                             memberHandle:
   *                               type: string
   *                               description: Member's handle
   *                             defaultDenom:
   *                               type: string
   *                               description: Member's default denomination
   *                         account:
   *                           type: object
   *                           description: Account-level dashboard data
   *                           properties:
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                             accountName:
   *                               type: string
   *                             accountHandle:
   *                               type: string
   *                             accountType:
   *                               type: string
   *                               enum: [PERSONAL, BUSINESS, CREDEX_FOUNDATION, TRUST, OPERATIONS]
   *                               description: Type of the account
   *                             defaultDenom:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU, ZWG]
   *                             isOwnedAccount:
   *                               type: boolean
   *                               description: Whether the member owns this account
   *                             sendOffersTo:
   *                               type: object
   *                               description: Member configured to receive offers for this account
   *                               properties:
   *                                 memberID:
   *                                   type: string
   *                                   format: uuid
   *                                 firstname:
   *                                   type: string
   *                                 lastname:
   *                                   type: string
   *                             balanceData:
   *                               type: object
   *                               description: Account balance information
   *                               properties:
   *                                 securedNetBalancesByDenom:
   *                                   type: array
   *                                   items:
   *                                     type: string
   *                                     description: Formatted balance with denomination (e.g. "100.00 USD")
   *                                 unsecuredBalancesInDefaultDenom:
   *                                   type: object
   *                                   properties:
   *                                     totalPayables:
   *                                       type: string
   *                                       description: Total payables in account default denomination
   *                                     totalReceivables:
   *                                       type: string
   *                                       description: Total receivables in account default denomination
   *                                     netPayRec:
   *                                       type: string
   *                                       description: Net payables/receivables in account default denomination
   *                                 netCredexAssetsInDefaultDenom:
   *                                   type: string
   *                                   description: Net credex assets in account default denomination
   *                             pendingInData:
   *                               type: array
   *                               description: Pending incoming transactions
   *                               items:
   *                                 type: object
   *                                 description: Pending transaction details
   *                             pendingOutData:
   *                               type: array
   *                               description: Pending outgoing transactions
   *                               items:
   *                                 type: object
   *                                 description: Pending transaction details
   *       400:
   *         description: Invalid input data or validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Your secured credex for 7.00 USD cannot be issued because your maximum securable USD balance is 5.00 USD"
   *                   description: Human-friendly error message
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
   *                           enum: [CREDEX_CREATE_FAILED, ERROR_VALIDATION]
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
   *                               enum: [INSUFFICIENT_SECURED_BALANCE, INVALID_AMOUNT, INVALID_DATE, VALIDATION_ERROR]
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                             suggestion:
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
   *                       description: Empty dashboard object
   *       403:
   *         description: Not authorized or insufficient tier level
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Insufficient membership tier for secured credex"
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
   *                               enum: [FORBIDDEN, INSUFFICIENT_TIER]
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
   *                   example: "Account not found"
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
   *                       description: Empty dashboard object
   */
  router.post(
    `/createCredex`,
    validateRequest(createCredexSchema),
    authenticatedHandler(CreateCredexController)
  );
  logger.debug("Route registered: POST /createCredex");

  return router;
}
