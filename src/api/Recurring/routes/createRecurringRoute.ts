import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { createRecurringSchema } from "../recurringValidationSchemas";
import { CreateRecurringController } from "../controllers/createRecurring";
import { RecurringRequest } from "../types";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/recurring/createRecurring:
 *   post:
 *     tags: [Recurring]
 *     summary: Create recurring transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceAccountID
 *               - targetAccountID
 *               - templateType
 *               - frequency
 *               - startDate
 *             properties:
 *               sourceAccountID:
 *                 type: string
 *                 format: uuid
 *               targetAccountID:
 *                 type: string
 *                 format: uuid
 *               templateType:
 *                 type: string
 *                 enum: [REGULAR, DCO_GIVE]
 *               frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY]
 *               startDate:
 *                 type: string
 *                 format: date
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 description: Required if templateType is REGULAR
 *               denomination:
 *                 type: string
 *                 enum: [CXX, CAD, USD, XAU, ZWG]
 *                 description: Required if templateType is REGULAR
 *               securedCredex:
 *                 type: boolean
 *                 description: Optional for REGULAR templates
 *               DCOgiveInCXX:
 *                 type: number
 *                 minimum: 0
 *                 description: Required if templateType is DCO_GIVE
 *               DCOdenom:
 *                 type: string
 *                 enum: [CXX, CAD, USD, XAU, ZWG]
 *                 description: Required if templateType is DCO_GIVE
 *     responses:
 *       200:
 *         description: Recurring transaction created successfully
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
export const createRecurringRoute = [
  validateRequest(createRecurringSchema),
  (req: Request, res: Response, next: NextFunction) =>
    CreateRecurringController(req as RecurringRequest, res, next),
  errorHandler,
];
