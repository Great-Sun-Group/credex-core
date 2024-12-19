import express from "express";
import { AcceptCredexController } from "../controllers/acceptCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { acceptCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function acceptCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /acceptCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Accept a Credex transaction
   *     description: Accepts a pending Credex transaction, finalizing the agreement between parties. Requires authentication.
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
   *                 description: ID of the Credex to accept
   *     responses:
   *       200:
   *         description: Credex accepted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Secured credex for $2.58 USD accepted successfully"
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
   *                           description: The credexID of the accepted transaction
   *                         type:
   *                           type: string
   *                           enum: [CREDEX_ACCEPTED]
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
   *                             acceptorAccountID:
   *                               type: string
   *                               format: uuid
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
   *         description: Invalid input data or Credex not in acceptable state
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Cannot accept Credex: invalid state"
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
   *                               enum: [INVALID_STATE, VALIDATION_ERROR]
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
   *         description: Not authorized to accept this Credex
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Not authorized to accept this Credex"
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
   *                       description: Empty dashboard object
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
   *                       description: Empty dashboard object
   *       409:
   *         description: Credex has already been accepted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Credex has already been accepted"
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
   *                               enum: [ALREADY_ACCEPTED]
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
    `/acceptCredex`,
    validateRequest(acceptCredexSchema),
    authenticatedHandler(AcceptCredexController)
  );
  logger.debug("Route registered: POST /acceptCredex");

  return router;
}
