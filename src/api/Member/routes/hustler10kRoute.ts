import express from "express";
import { Hustler10kController } from "../controllers/hustler10k";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { authMiddleware, authenticatedHandler } from "../../../middleware/authMiddleware";
import { hustler10kSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function hustler10kRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /hustler10k:
   *   post:
   *     tags: [Members]
   *     summary: Process Hustler 10k program enrollment
   *     description: Creates a secured Credex from personal account to greatsun_ops and updates member tier
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - personalAccountID
   *             properties:
   *               personalAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member's personal account
   *     responses:
   *       200:
   *         description: Successfully processed Hustler 10k enrollment
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
   *                         type:
   *                           type: string
   *                           enum: [HUSTLER_10K_ENROLLED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                             credexID:
   *                               type: string
   *                               format: uuid
   *                             newTier:
   *                               type: integer
   *                               example: 3
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
   *         description: Invalid input, insufficient balance, or business rule violation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Error message
   *                   example: Your secured credex for 1.00 USD cannot be issued because your maximum securable USD balance is 0.50 USD
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
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
   *                               enum: [INSUFFICIENT_SECURED_BALANCE, MISSING_PARAMS]
   *                               example: INSUFFICIENT_SECURED_BALANCE
   *                             reason:
   *                               type: string
   *                               description: Detailed error message
   *                               example: Your secured credex for 1.00 USD cannot be issued because your maximum securable USD balance is 0.50 USD
   *                     dashboard:
   *                       type: object
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/hustler10k`,
    authMiddleware(),
    validateRequest(hustler10kSchema),
    authenticatedHandler(Hustler10kController),
    errorHandler
  );
  logger.debug("Route registered: POST /hustler10k");

  return router;
}
