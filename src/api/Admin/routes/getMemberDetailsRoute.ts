import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getMemberSchema } from "../adminSchemas";
import { getMemberDetailsController } from "../controllers/getMemberDetailsController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/admin/getMemberDetails:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Get detailed member information
 *     security:
 *       - adminAuth: [1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetMemberID
 *             properties:
 *               targetMemberID:
 *                 type: string
 *                 format: uuid
 */
export const getMemberDetailsRoute = [
  adminAuth(1),
  validateRequest(getMemberSchema),
  getMemberDetailsController,
  errorHandler,
];
