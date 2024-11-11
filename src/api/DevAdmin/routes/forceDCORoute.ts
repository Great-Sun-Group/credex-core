import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { forceDCOSchema } from "../devAdminSchemas";
import { ForceDCOController } from "../controllers/forceDCO";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/devadmin/forceDCO:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Force DCO execution (NOT AVAILABLE IN PRODUCTION)
 *     description: Development-only route for forcing Daily Credcoin Offering execution. This endpoint is not published in production deployment.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: No parameters required
 */
export const forceDCORoute = [
  validateRequest(forceDCOSchema),
  ForceDCOController,
  errorHandler,
];
