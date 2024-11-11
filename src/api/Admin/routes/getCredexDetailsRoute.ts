import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { getCredexSchema } from "../adminSchemas";
import { getCredexDetailsController } from "../controllers/getCredexDetailsController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/admin/getCredexDetails:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Get detailed Credex information
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
 */
export const getCredexDetailsRoute = [
  adminAuth(1),
  validateRequest(getCredexSchema),
  getCredexDetailsController,
  errorHandler,
];
