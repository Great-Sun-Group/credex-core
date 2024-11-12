import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getCredexSchema } from "../adminSchemas";
import { getCredexDetailsController } from "../controllers/getCredexDetailsController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /admin/getCredexDetails:
 *   post:
 *     tags: [Admin]
 *     summary: Get detailed Credex information
 *     description: Retrieves comprehensive details about a credex transaction using credexID
 *     security:
 *       - adminAuth: [1]
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
 *                 description: Unique identifier of the credex transaction
 *     responses:
 *       200:
 *         description: Credex details retrieved successfully
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
 *                   example: Credex details retrieved successfully
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
 *                           description: Credex ID
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_CREDEX_FOUND]
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           description: Who performed the action (system)
 *                         details:
 *                           type: object
 *                           properties:
 *                             credexID:
 *                               type: string
 *                               format: uuid
 *                             type:
 *                               type: string
 *                             denomination:
 *                               type: string
 *                             initialAmount:
 *                               type: string
 *                             status:
 *                               type: string
 *                             secured:
 *                               type: boolean
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         credexInfo:
 *                           type: object
 *                           properties:
 *                             credexID:
 *                               type: string
 *                               format: uuid
 *                             type:
 *                               type: string
 *                             denomination:
 *                               type: string
 *                             initialAmount:
 *                               type: string
 *                             outstandingAmount:
 *                               type: string
 *                             defaultedAmount:
 *                               type: string
 *                             redeemedAmount:
 *                               type: string
 *                             status:
 *                               type: string
 *                             cxxMultiplier:
 *                               type: number
 *                             writtenOffAmount:
 *                               type: string
 *                             dueDate:
 *                               type: string
 *                               format: date-time
 *                             acceptedAt:
 *                               type: string
 *                               format: date-time
 *                             declinedAt:
 *                               type: string
 *                               format: date-time
 *                             cancelledAt:
 *                               type: string
 *                               format: date-time
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                         relationships:
 *                           type: object
 *                           properties:
 *                             issuer:
 *                               type: object
 *                               properties:
 *                                 accountID:
 *                                   type: string
 *                                   format: uuid
 *                                 accountName:
 *                                   type: string
 *                                 accountHandle:
 *                                   type: string
 *                                 accountType:
 *                                   type: string
 *                                 ownerID:
 *                                   type: string
 *                                   format: uuid
 *                                 signerID:
 *                                   type: string
 *                                   format: uuid
 *                             acceptor:
 *                               type: object
 *                               properties:
 *                                 accountID:
 *                                   type: string
 *                                   format: uuid
 *                                 accountName:
 *                                   type: string
 *                                 accountHandle:
 *                                   type: string
 *                                 accountType:
 *                                   type: string
 *                                 ownerID:
 *                                   type: string
 *                                   format: uuid
 *                                 signerID:
 *                                   type: string
 *                                   format: uuid
 *                             securer:
 *                               type: object
 *                               nullable: true
 *                               properties:
 *                                 accountID:
 *                                   type: string
 *                                   format: uuid
 *                                 accountName:
 *                                   type: string
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
 *                   example: Invalid credexID format
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
 *         description: Credex not found
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
 *                   example: Credex not found
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
 *                   example: Error fetching credex details
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
export const getCredexDetailsRoute = [
  adminAuth(1),
  validateRequest(getCredexSchema),
  getCredexDetailsController,
  errorHandler,
];
