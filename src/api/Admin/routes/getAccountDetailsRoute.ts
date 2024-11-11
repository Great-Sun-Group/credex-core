import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getAccountSchema } from "../adminSchemas";
import { getAccountDetailsController } from "../controllers/getAccountDetailsController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/admin/getAccountDetails:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Get detailed account information
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
export const getAccountDetailsRoute = [
  adminAuth(1),
  validateRequest(getAccountSchema),
  getAccountDetailsController,
  errorHandler,
];
