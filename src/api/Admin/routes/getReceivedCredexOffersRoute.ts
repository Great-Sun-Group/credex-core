import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getAccountReceivedCredexOffersSchema } from "../adminSchemas";
import { getReceivedCredexOffersController } from "../controllers/getReceivedCredexOffersController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /admin/getReceivedCredexOffers:
 *   post:
 *     tags: [Admin]
 *     summary: Get received Credex offers
 *     description: Retrieves all credex offers received by an account using accountID or accountHandle
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
 *         description: Received credex offers retrieved successfully
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
 *                   example: Received credex offers retrieved successfully
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
 *                           enum: [ADMIN_CREDEX_OFFERS_FOUND]
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
 *                             offersCount:
 *                               type: number
 *                             totalInitialAmount:
 *                               type: string
 *                             totalOutstandingAmount:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         accountInfo:
 *                           type: object
 *                           properties:
 *                             accountID:
 *                               type: string
 *                               format: uuid
 *                             defaultDenom:
 *                               type: string
 *                         offers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               credexID:
 *                                 type: string
 *                                 format: uuid
 *                               type:
 *                                 type: string
 *                               denomination:
 *                                 type: string
 *                               initialAmount:
 *                                 type: string
 *                               outstandingAmount:
 *                                 type: string
 *                               defaultedAmount:
 *                                 type: string
 *                               redeemedAmount:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               cxxMultiplier:
 *                                 type: number
 *                               writtenOffAmount:
 *                                 type: string
 *                               dueDate:
 *                                 type: string
 *                                 format: date-time
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               sender:
 *                                 type: object
 *                                 properties:
 *                                   accountID:
 *                                     type: string
 *                                     format: uuid
 *                                   accountHandle:
 *                                     type: string
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
 *         description: No received credex offers found
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
 *                   example: No received credex offers found
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
 *                   example: Error fetching received credex offers
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
export const getReceivedCredexOffersRoute = [
  adminAuth(1),
  validateRequest(getAccountReceivedCredexOffersSchema),
  getReceivedCredexOffersController,
  errorHandler,
];
