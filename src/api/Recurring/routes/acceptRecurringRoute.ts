import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { acceptRecurringSchema } from "../recurringValidationSchemas";
import { AcceptRecurringController } from "../controllers/acceptRecurring";
import { RecurringRequest } from "../types";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/recurring/acceptRecurring:
 *   post:
 *     tags: [Recurring]
 *     summary: Accept a recurring transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recurringID
 *               - signerID
 *             properties:
 *               recurringID:
 *                 type: string
 *                 format: uuid
 *               signerID:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Recurring transaction accepted successfully
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
export const acceptRecurringRoute = [
  validateRequest(acceptRecurringSchema),
  (req: Request, res: Response, next: NextFunction) =>
    AcceptRecurringController(req as RecurringRequest, res, next),
  errorHandler,
];
