import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getRecurringSchema } from "../recurringValidationSchemas";
import { GetRecurringController } from "../controllers/getRecurring";
import { RecurringRequest } from "../types";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/recurring/getRecurring:
 *   post:
 *     tags: [Recurring]
 *     summary: Get recurring transaction details
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
 *               accountID:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Recurring transaction details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                       format: uuid
 *                     ownerID:
 *                       type: string
 *                       format: uuid
 *                     sourceAccountID:
 *                       type: string
 *                       format: uuid
 *                     targetAccountID:
 *                       type: string
 *                       format: uuid
 *                     frequency:
 *                       type: string
 *                       enum: [DAILY, WEEKLY, MONTHLY]
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     duration:
 *                       type: integer
 *                     templateType:
 *                       type: string
 *                       enum: [REGULAR, DCO_GIVE]
 *                     amount:
 *                       type: number
 *                     denomination:
 *                       type: string
 *                       enum: [CXX, CAD, USD, XAU, ZWG]
 *                     securedCredex:
 *                       type: boolean
 *                     DCOgiveInCXX:
 *                       type: number
 *                     DCOdenom:
 *                       type: string
 *                       enum: [CXX, CAD, USD, XAU, ZWG]
 *                 message:
 *                   type: string
 */
export const getRecurringRoute = [
  validateRequest(getRecurringSchema),
  (req: Request, res: Response, next: NextFunction) =>
    GetRecurringController(req as RecurringRequest, res, next),
  errorHandler,
];
