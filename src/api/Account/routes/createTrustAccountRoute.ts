import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { createTrustAccountSchema } from "../accountValidationSchemas";
import { createTrustAccountController } from "../controllers/createTrustAccount";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { errorHandler } from "../../../middleware/errorHandler";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /createTrustAccount:
 *   post:
 *     summary: Create a new trust account
 *     description: Creates a new trust account with BANK or VAULT subtype. Only available to tier 5 members.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountName
 *               - accountHandle
 *               - subtype
 *               - denomination
 *             properties:
 *               accountName:
 *                 type: string
 *                 description: Name of the trust account
 *               accountHandle:
 *                 type: string
 *                 description: Unique handle for the account
 *               subtype:
 *                 type: string
 *                 enum: [BANK, VAULT]
 *                 description: Type of trust account
 *               denomination:
 *                 type: string
 *                 description: Account denomination
 *               bankFields:
 *                 type: object
 *                 description: Required for BANK subtype. Contains jurisdiction-specific bank details.
 *                 properties:
 *                   jurisdiction:
 *                     type: string
 *                     description: Country code (e.g., CA, US, ZW)
 *     responses:
 *       201:
 *         description: Trust account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: The accountID of the created trust account
 *                         type:
 *                           type: string
 *                           enum: [TRUST_ACCOUNT_CREATED]
 *                           description: Business action type
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           description: When the action occurred
 *                         actor:
 *                           type: string
 *                           format: uuid
 *                           description: MemberID who performed the action
 *                         details:
 *                           type: object
 *                           properties:
 *                             accountID:
 *                               type: string
 *                               format: uuid
 *                             accountHandle:
 *                               type: string
 *                             subtype:
 *                               type: string
 *                               enum: [BANK, VAULT]
 *                             denomination:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *                       description: Full dashboard state after the action
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
 *                                 enum: [PERSONAL, TRUST, OPERATIONS]
 *                                 description: Type of the account
 *                               defaultDenom:
 *                                 type: string
 *                                 enum: [CXX, CAD, USD, XAU]
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
 *                               pendingInData:
 *                                 type: array
 *                                 description: Pending incoming transactions
 *                                 items:
 *                                   type: object
 *                                   description: Pending transaction details
 *                               pendingOutData:
 *                                 type: array
 *                                 description: Pending outgoing transactions
 *                                 items:
 *                                   type: object
 *                                   description: Pending transaction details
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
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - requires authentication
 *       403:
 *         description: Forbidden - requires tier 5 membership
 */

const router = express.Router();

router.post(
  `/createTrustAccount`,
  validateRequest(createTrustAccountSchema),
  authenticatedHandler(createTrustAccountController),
  errorHandler
);
logger.debug("Route registered: POST /createTrustAccount");

export default function createTrustAccountRoute() {
  return router;
}
