import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { clearDevDBsSchema } from "../devAdminSchemas";
import { ClearDevDBsController } from "../controllers/clearDevDBs";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/devadmin/clearDevDBs:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Clear development databases (NOT AVAILABLE IN PRODUCTION)
 *     description: Development-only route for clearing test databases. This endpoint is not published in production deployment.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: No parameters required
 */
export const clearDevDBsRoute = [
  validateRequest(clearDevDBsSchema),
  ClearDevDBsController,
  errorHandler,
];
