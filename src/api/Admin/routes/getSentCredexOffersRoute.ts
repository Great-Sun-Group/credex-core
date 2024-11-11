import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getSentCredexOffersSchema } from "../adminSchemas";
import { getSentCredexOffersController } from "../controllers/getSentCredexOffersController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/admin/getSentCredexOffers:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Get sent Credex offers
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
export const getSentCredexOffersRoute = [
  adminAuth(1),
  validateRequest(getSentCredexOffersSchema),
  getSentCredexOffersController,
  errorHandler,
];
