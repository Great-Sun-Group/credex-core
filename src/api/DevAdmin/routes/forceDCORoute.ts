import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { forceDCOSchema } from "../devAdminSchemas";
import { ForceDCOController } from "../controllers/forceDCO";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/devadmin/forceDCO:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Force DCO execution (NOT AVAILABLE IN PRODUCTION)
 *     description: Development-only route for forcing Daily Credcoin Offering execution. This endpoint is not published in production deployment.
 *     security:
 *       - devAdminAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: No parameters required
 *     responses:
 *       200:
 *         description: Daily Credcoin Offering executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - message
 *                 - data
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Human-friendly success message
 *                   example: Daily Credcoin Offering forced successfully
 *                 data:
 *                   type: object
 *                   required:
 *                     - action
 *                     - dashboard
 *                   properties:
 *                     action:
 *                       type: object
 *                       required:
 *                         - id
 *                         - type
 *                         - timestamp
 *                         - actor
 *                         - details
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: Unique DCO identifier
 *                           example: DCO-2024-01-20-FORCED
 *                         type:
 *                           type: string
 *                           description: Type of action performed
 *                           example: DEV_ADMIN_DCO_FORCED
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           description: When the DCO started
 *                           example: "2024-01-20T12:00:00.000Z"
 *                         actor:
 *                           type: string
 *                           description: Who performed the action
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             dcoID:
 *                               type: string
 *                               description: DCO execution identifier
 *                               example: DCO-2024-01-20-FORCED
 *                             status:
 *                               type: string
 *                               description: Execution status
 *                               example: completed
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                               description: When DCO completed
 *                               example: "2024-01-20T12:05:00.000Z"
 *                             affectedAccounts:
 *                               type: integer
 *                               description: Number of accounts processed
 *                               example: 95
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         dcoInfo:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: DCO identifier
 *                               example: DCO-2024-01-20-FORCED
 *                             status:
 *                               type: string
 *                               description: Execution status
 *                               example: completed
 *                             startTime:
 *                               type: string
 *                               format: date-time
 *                               description: When DCO started
 *                               example: "2024-01-20T12:00:00.000Z"
 *                             endTime:
 *                               type: string
 *                               format: date-time
 *                               description: When DCO completed
 *                               example: "2024-01-20T12:05:00.000Z"
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalAccounts:
 *                               type: integer
 *                               description: Total accounts to process
 *                               example: 100
 *                             processedAccounts:
 *                               type: integer
 *                               description: Successfully processed accounts
 *                               example: 95
 *                             failedAccounts:
 *                               type: integer
 *                               description: Failed account processes
 *                               example: 5
 *       403:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized access to development admin functions
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: DCO-2024-01-20-FORCED
 *                         type:
 *                           type: string
 *                           example: DEV_ADMIN_ERROR_UNAUTHORIZED
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
 *                               example: UNAUTHORIZED
 *                             reason:
 *                               type: string
 *                               example: Unauthorized access to development admin functions
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error while forcing DCO
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: DCO-2024-01-20-FORCED
 *                         type:
 *                           type: string
 *                           example: DEV_ADMIN_ERROR_INTERNAL
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
 *                               example: INTERNAL_ERROR
 *                             reason:
 *                               type: string
 *                               example: Error during DCO execution
 */
export const forceDCORoute = [
  validateRequest(forceDCOSchema),
  ForceDCOController,
  errorHandler,
];
