import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getAccountReceivedCredexOffersSchema } from "../adminSchemas";
import { getReceivedCredexOffersController } from "../controllers/getReceivedCredexOffersController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/admin/getReceivedCredexOffers:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Get received Credex offers
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
 *               accountHandle:
 *                 type: string
 *                 pattern: ^[a-z0-9_]{3,30}$
 */
export const getReceivedCredexOffersRoute = [
  adminAuth(1),
  validateRequest(getAccountReceivedCredexOffersSchema),
  getReceivedCredexOffersController,
  errorHandler,
];
