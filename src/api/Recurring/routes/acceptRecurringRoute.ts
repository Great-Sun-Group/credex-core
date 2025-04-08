import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { acceptRecurringSchema } from "../recurringValidationSchemas";
import { AcceptRecurringController } from "../controllers/acceptRecurring";
import { RecurringRequest } from "../types";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /acceptRecurring:
 *   post:
 *     tags: [Recurring]
 *     summary: Accept a recurring transaction
 *     description: Accepts a pending recurring transaction. For DCO_GIVE templates, acceptance is automatic.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recurringID
 *             properties:
 *               recurringID:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the recurring transaction to accept
 *     responses:
 *       200:
 *         description: Recurring transaction accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recurring transaction accepted successfully"
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
 *                           description: The recurringID of the accepted transaction
 *                         type:
 *                           type: string
 *                           enum: [RECURRING_ACCEPTED]
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
 *                             recurringID:
 *                               type: string
 *                               format: uuid
 *                             amount:
 *                               type: string
 *                               description: Formatted amount with denomination
 *                             denomination:
 *                               type: string
 *                               enum: [CXX, CAD, USD, XAU]
 *                             frequency:
 *                               type: string
 *                               enum: [DAILY, WEEKLY, MONTHLY]
 *                             nextDate:
 *                               type: string
 *                               format: date
 *                             status:
 *                               type: string
 *                               enum: [ACTIVE]
 *                             scheduleInfo:
 *                               type: object
 *                               properties:
 *                                 frequency:
 *                                   type: string
 *                                 nextRunDate:
 *                                   type: string
 *                                   format: date
 *                                 amount:
 *                                   type: string
 *                                 denomination:
 *                                   type: string
 *                                 status:
 *                                   type: string
 *                                 templateType:
 *                                   type: string
 *                             participants:
 *                               type: object
 *                               properties:
 *                                 sourceAccountID:
 *                                   type: string
 *                                   format: uuid
 *                                 targetAccountID:
 *                                   type: string
 *                                   format: uuid
 *                             execution:
 *                               type: object
 *                               properties:
 *                                 lastRunDate:
 *                                   type: string
 *                                   format: date-time
 *                                 lastRunStatus:
 *                                   type: string
 *                                 totalExecutions:
 *                                   type: integer
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
 *         description: Invalid input data or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid recurring transaction ID"
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
 *                               example: "400"
 *                             reason:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *                       description: Empty dashboard state
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
 *                         type:
 *                           type: string
 *                           enum: [ERROR_UNAUTHORIZED]
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                               enum: [UNAUTHORIZED]
 *                     dashboard:
 *                       type: object
 *       403:
 *         description: Not authorized to accept this recurring transaction
 *       404:
 *         description: Recurring transaction not found
 *       409:
 *         description: Recurring transaction already accepted
 *       500:
 *         description: Internal server error
 */
export const acceptRecurringRoute = [
  validateRequest(acceptRecurringSchema),
  (req: Request, res: Response, next: NextFunction) =>
    AcceptRecurringController(req as RecurringRequest, res, next),
  errorHandler,
];
