import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { cancelRecurringSchema } from "../recurringValidationSchemas";
import { CancelRecurringController } from "../controllers/cancelRecurring";
import { RecurringRequest } from "../types";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/recurring/cancelRecurring:
 *   post:
 *     tags: [Recurring]
 *     summary: Cancel a recurring transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recurringID
 *               - ownerID
 *             properties:
 *               recurringID:
 *                 type: string
 *                 format: uuid
 *               ownerID:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Recurring transaction cancelled successfully
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
export const cancelRecurringRoute = [
  validateRequest(cancelRecurringSchema),
  (req: Request, res: Response, next: NextFunction) =>
    CancelRecurringController(req as RecurringRequest, res, next),
  errorHandler,
];
