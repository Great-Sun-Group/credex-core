import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getRecurringSchema } from "../recurringValidationSchemas";
import { GetRecurringController } from "../controllers/getRecurring";
import { RecurringRequest } from "../types";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /getRecurring:
 *   post:
 *     tags: [Recurring]
 *     summary: Get recurring transaction details
 *     description: Retrieves details of a recurring transaction. Member must own either the source or target account.
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
 *               - accountID
 *             properties:
 *               recurringID:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the recurring transaction to retrieve
 *               accountID:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the account (source or target) owned by the requesting member
 *     responses:
 *       200:
 *         description: Recurring transaction details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recurring transaction details retrieved successfully"
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
 *                           description: The recurringID of the retrieved transaction
 *                         type:
 *                           type: string
 *                           enum: [RECURRING_RETRIEVED]
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
 *                               enum: [CXX, CAD, USD, XAU, ZWG]
 *                             frequency:
 *                               type: string
 *                               enum: [DAILY, WEEKLY, MONTHLY]
 *                             nextDate:
 *                               type: string
 *                               format: date
 *                             status:
 *                               type: string
 *                               enum: [PENDING, ACTIVE, CANCELLED]
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
 *                                 daysBetweenPays:
 *                                   type: integer
 *                                 remainingPays:
 *                                   type: integer
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
 *                       description: Dashboard state containing recurring transactions
 *                       properties:
 *                         recurringTransactions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/RecurringActionDetails'
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
 *         description: Not authorized to view this recurring transaction
 *       404:
 *         description: Recurring transaction not found or not accessible
 *       500:
 *         description: Internal server error
 */
export const getRecurringRoute = [
  validateRequest(getRecurringSchema),
  (req: Request, res: Response, next: NextFunction) =>
    GetRecurringController(req as RecurringRequest, res, next),
  errorHandler,
];
