import express from "express";
import { DeclineCredexController } from "../controllers/declineCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { declineCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function declineCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /declineCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Decline a Credex transaction
   *     description: Declines a pending Credex transaction, rejecting the proposed agreement. Only the receiver can decline a Credex offer. Returns updated dashboard data.
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
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the Credex to decline
   *     responses:
   *       200:
   *         description: Credex declined successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Credex declined successfully"
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
   *                           description: The credexID of the declined transaction
   *                         type:
   *                           type: string
   *                           enum: [CREDEX_DECLINED]
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
   *                               description: Amount is zeroed on decline
   *                               example: "0"
   *                             denomination:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU]
   *                               description: Original denomination of the Credex
   *                             securedCredex:
   *                               type: boolean
   *                               description: Not relevant for declined Credex
   *                               example: false
   *                             receiverAccountID:
   *                               type: string
   *                               format: uuid
   *                             reason:
   *                               type: string
   *                               example: "Declined by receiver"
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
   *         description: Invalid input data or Credex not in declinable state
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Cannot decline Credex: invalid state"
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
   *                           description: The attempted credexID for business logic errors, null for validation errors
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
   *                               enum: [INVALID_STATE, VALIDATION_ERROR, DECLINE_FAILED]
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                             suggestion:
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
   *                           example: system
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
   *         description: Not authorized to decline this Credex (must be receiver)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Not authorized to decline this Credex"
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
   *                           description: The attempted credexID
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
   *                               enum: [NOT_FOUND]
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       409:
   *         description: Credex has already been processed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Credex has already been processed"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The attempted credexID
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
   *                               enum: [ALREADY_PROCESSED]
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
   *                           example: system
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
    `/declineCredex`,
    validateRequest(declineCredexSchema),
    authenticatedHandler(DeclineCredexController)
  );
  logger.debug("Route registered: POST /declineCredex");

  return router;
}
