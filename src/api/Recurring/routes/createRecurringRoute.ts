import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { createRecurringSchema } from "../recurringValidationSchemas";
import { CreateRecurringController } from "../controllers/createRecurring";
import { RecurringRequest } from "../types";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /createRecurring:
 *   post:
 *     tags: [Recurring]
 *     summary: Create a new recurring transaction
 *     description: Creates a new recurring transaction schedule. Supports REGULAR, DCO_GIVE, and MEMBERTIER_SUBSCRIPTION template types. For subscriptions, targetAccountID is optional (defaults to greatsun_ops) and auto-acceptance is applied.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceAccountID
 *               - templateType
 *               - payFrequency
 *               - startDate
 *             properties:
 *               sourceAccountID:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the source account
 *               targetAccountID:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the target account (required for REGULAR/DCO_GIVE, optional for MEMBERTIER_SUBSCRIPTION)
 *               templateType:
 *                 type: string
 *                 enum: [REGULAR, DCO_GIVE, MEMBERTIER_SUBSCRIPTION]
 *                 description: Type of recurring template
 *               payFrequency:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of days between payments (28 for subscriptions)
 *               startDate:
 *                 type: string
 *                 format: date
 *                 pattern: ^\d{4}-\d{2}-\d{2}$
 *                 description: Start date for recurring schedule
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 description: Optional duration in days
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Required if templateType is REGULAR
 *               denomination:
 *                 type: string
 *                 enum: [CXX, CAD, USD, XAU, ZWG]
 *                 description: Required if templateType is REGULAR
 *               securedCredex:
 *                 type: boolean
 *                 description: Optional for REGULAR templates (always true for subscriptions)
 *               DCOgiveInCXX:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Required if templateType is DCO_GIVE
 *               DCOdenom:
 *                 type: string
 *                 enum: [CXX, CAD, USD, XAU, ZWG]
 *                 description: Required if templateType is DCO_GIVE
 *               memberTier:
 *                 type: integer
 *                 enum: [3]
 *                 description: Required if templateType is MEMBERTIER_SUBSCRIPTION (only tier 3 supported)
 *     responses:
 *       201:
 *         description: Recurring transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recurring transaction created successfully"
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
 *                           description: The recurringID of the created transaction
 *                         type:
 *                           type: string
 *                           enum: [RECURRING_CREATED]
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
 *                             payFrequency:
 *                               type: integer
 *                               description: Number of days between payments
 *                             nextDate:
 *                               type: string
 *                               format: date
 *                             status:
 *                               type: string
 *                               enum: [PENDING, ACTIVE, CANCELLED]
 *                             scheduleInfo:
 *                               type: object
 *                               properties:
 *                                 payFrequency:
 *                                   type: integer
 *                                   description: Number of days between payments
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
 *                                 memberTier:
 *                                   type: integer
 *                                   description: Present for subscription templates
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
 *                                 totalExecutions:
 *                                   type: integer
 *                     dashboard:
 *                       type: object
 *                       description: Full dashboard state after the action
 *       400:
 *         description: Invalid input data or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid template type"
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
 *                               example: "400"
 *                             reason:
 *                               type: string
 *                             field:
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
 *         description: Not authorized to create recurring transaction
 *       404:
 *         description: Account not found or invalid foundation account for DCO_GIVE
 *       500:
 *         description: Internal server error
 */
export const createRecurringRoute = [
  validateRequest(createRecurringSchema),
  (req: Request, res: Response, next: NextFunction) =>
    CreateRecurringController(req as RecurringRequest, res, next),
  errorHandler,
];
