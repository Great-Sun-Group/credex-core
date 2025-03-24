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
   *                 enum: [CXX, CAD, USD, XAU]
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
   *               invoiceID:
   *                 type: string
   *                 format: uuid
   *                 description: Optional ID of an invoice to execute with this Credex
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
   *                   example: "Secured credex for 100.00 USD offers created successfully"
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
   *                             amount:
   *                               type: string
   *                               pattern: ^\d+\.\d{2}$
   *                               example: "100.00"
   *                               description: Amount in decimal format
   *                             denomination:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU]
   *                             securedCredex:
   *                               type: boolean
   *                             receiverAccountID:
   *                               type: string
   *                               format: uuid
   *                             receiverAccountName:
   *                               type: string
   *                             invoiceID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the executed invoice (if applicable)
   *                     dashboard:
   *                       type: object
   *                       description: Current state of the account dashboard
   *                       properties:
   *                         member:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                             memberTier:
   *                               type: integer
   *                             remainingAvailableUSD:
   *                               type: number
   *                               nullable: true
   *                               description: null for memberTier>=3
   *                             firstname:
   *                               type: string
   *                             lastname:
   *                               type: string
   *                             memberHandle:
   *                               type: string
   *                             defaultDenom:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU]
  
 *                         accountsInternal:
 *                           type: array
 *                           description: List of internal accounts owned by the member
 *                           items:
 *                             type: object
 *                             properties:
 *                               accountID:
 *                                 type: string
 *                                 format: uuid
 *                                 description: Unique identifier for the internal account
 *                               accountName:
 *                                 type: string
 *                                 description: Name of the internal account
 *                               accountType:
 *                                 type: string
 *                                 enum: [CONSUMPTION, PRODUCTION, DIGITAL_ASSET, PHYSICAL_ASSET]
 *                                 description: Type of the internal account
 *                         accounts:
   *                           type: array
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
   *                                 enum: [PERSONAL, TRUST, OPERATIONS]
   *                               defaultDenom:
   *                                 type: string
   *                                 enum: [CXX, CAD, USD, XAU]
   *                               isOwnedAccount:
   *                                 type: boolean
   *                               sendOffersTo:
   *                                 type: object
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
   *                                 properties:
   *                                   securedNetBalancesByDenom:
   *                                     type: array
   *                                     items:
   *                                       type: string
   *                                       example: "-100.00 USD"
   *                                   unsecuredBalancesInDefaultDenom:
   *                                     type: object
   *                                     properties:
   *                                       totalPayables:
   *                                         type: string
   *                                         example: "0.00 USD"
   *                                       totalReceivables:
   *                                         type: string
   *                                         example: "0.00 USD"
   *                                       netPayRec:
   *                                         type: string
   *                                         example: "0.00 USD"
   *                                   netCredexAssetsInDefaultDenom:
   *                                     type: string
   *                                     example: "-8502.53 USD"
   *                               pendingInData:
   *                                 type: array
   *                                 items:
   *                                   type: object
   *                                   properties:
   *                                     credexID:
   *                                       type: string
   *                                       format: uuid
   *                                     formattedInitialAmount:
   *                                       type: string
   *                                       example: "-100.00 USD"
   *                                     counterpartyAccountName:
   *                                       type: string
   *                                     secured:
   *                                       type: boolean
   *                               pendingOutData:
   *                                 type: array
   *                                 items:
   *                                   type: object
   *                                   properties:
   *                                     credexID:
   *                                       type: string
   *                                       format: uuid
   *                                     formattedInitialAmount:
   *                                       type: string
   *                                       example: "-100.00 USD"
   *                                     counterpartyAccountName:
   *                                       type: string
   *                                     secured:
   *                                       type: boolean
   *       400:
   *         description: Invalid input data or validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
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
   *                           enum: [system]
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
   *       403:
   *         description: Not authorized or insufficient tier level
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
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
   *                               enum: [FORBIDDEN, INSUFFICIENT_TIER, INSUFFICIENT_SECURED_BALANCE]
   *                               description: FORBIDDEN for account not found, INSUFFICIENT_TIER for tier level issues, INSUFFICIENT_SECURED_BALANCE for insufficient secured balance
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
