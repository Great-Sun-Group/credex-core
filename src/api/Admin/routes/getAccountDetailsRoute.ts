import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getAccountSchema } from "../adminSchemas";
import { getAccountDetailsController } from "../controllers/getAccountDetailsController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /admin/getAccountDetails:
 *   post:
 *     tags: [Admin]
 *     summary: Get detailed account information
 *     description: Retrieves comprehensive details about an account using either accountID or accountHandle
 *     security:
 *       - adminAuth: [1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - required: [accountID]
 *               - required: [accountHandle]
 *             properties:
 *               accountID:
 *                 type: string
 *                 format: uuid
 *                 description: Unique identifier of the account
 *               accountHandle:
 *                 type: string
 *                 pattern: ^[a-z0-9_]{3,30}$
 *                 description: Handle/username of the account
 *     responses:
 *       200:
 *         description: Account details retrieved successfully
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
 *                   example: Account details retrieved successfully
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
 *                           format: uuid
 *                           description: Account ID
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_ACCOUNT_FOUND]
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           description: Who performed the action (system)
 *                         details:
 *                           type: object
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
 *                             ownerID:
 *                               type: string
 *                               format: uuid
 *                             ownerHandle:
 *                               type: string
 *                             ownerTier:
 *                               type: number
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         accountInfo:
 *                           type: object
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
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                             updatedAt:
 *                               type: string
 *                               format: date-time
 *                         owner:
 *                           type: object
 *                           properties:
 *                             memberID:
 *                               type: string
 *                               format: uuid
 *                             memberHandle:
 *                               type: string
 *                             memberTier:
 *                               type: number
 *                         credexStats:
 *                           type: object
 *                           properties:
 *                             numberOfCredexOwed:
 *                               type: number
 *                             owedCredexes:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             owedAccounts:
 *                               type: array
 *                               items:
 *                                 type: string
 *       400:
 *         description: Invalid request parameters
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
 *                   example: Invalid accountID format
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
 *                           nullable: true
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_ERROR_VALIDATION]
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
 *                             reason:
 *                               type: string
 *                             field:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *       404:
 *         description: Account not found
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
 *                   example: Account not found
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
 *                           format: uuid
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_ERROR_NOT_FOUND]
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
 *                             reason:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *       500:
 *         description: Internal server error
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
 *                   example: Error fetching account details
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
 *                           format: uuid
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_ERROR_INTERNAL]
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
 *                             reason:
 *                               type: string
 *                     dashboard:
 *                       type: object
 */
export const getAccountDetailsRoute = [
  adminAuth(1),
  validateRequest(getAccountSchema),
  getAccountDetailsController,
  errorHandler,
];
