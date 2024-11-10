import express, { Response, NextFunction, Request } from "express";
import { CreateRecurringController } from "./controllers/createRecurring";
import { AcceptRecurringController } from "./controllers/acceptRecurring";
import { CancelRecurringController } from "./controllers/cancelRecurring";
import { GetRecurringController } from "./controllers/getRecurring";
import { validateRequest } from "../../middleware/validateRequest";
import { errorHandler } from "../../middleware/errorHandler";
import {
  createRecurringSchema,
  acceptRecurringSchema,
  cancelRecurringSchema,
  getRecurringSchema,
} from "./recurringValidationSchemas";
import { RecurringRequest, TEMPLATE_TYPES } from "./types";
import logger from "../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Recurring
 *   description: Recurring transaction management
 */

export default function RecurringRoutes() {
  const router = express.Router();
  logger.info("Initializing Recurring routes");

  /**
   * @swagger
   * /api/recurring/createRecurring:
   *   post:
   *     tags: [Recurring]
   *     summary: Create a recurring transaction
   *     description: Creates a new recurring transaction with support for different template types (REGULAR and DCO_GIVE)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ownerID
   *               - sourceAccountID
   *               - targetAccountID
   *               - templateType
   *               - frequency
   *               - startDate
   *             properties:
   *               ownerID:
   *                 type: string
   *                 format: uuid
   *               sourceAccountID:
   *                 type: string
   *                 format: uuid
   *               targetAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: For DCO_GIVE templates, must be a foundation account
   *               templateType:
   *                 type: string
   *                 enum: [REGULAR, DCO_GIVE]
   *                 description: Determines the type of recurring template
   *               frequency:
   *                 type: string
   *                 enum: [DAILY, WEEKLY, MONTHLY]
   *               startDate:
   *                 type: string
   *                 pattern: ^\d{4}-\d{2}-\d{2}$
   *                 example: "2024-01-01"
   *               duration:
   *                 type: integer
   *                 minimum: 1
   *               # Regular template specific fields
   *               amount:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *                 description: Required for REGULAR templates
   *               denomination:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Required for REGULAR templates
   *               securedCredex:
   *                 type: boolean
   *                 description: Optional for REGULAR templates
   *               # DCO_GIVE template specific fields
   *               DCOgiveInCXX:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *                 description: Required for DCO_GIVE templates
   *               DCOdenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Required for DCO_GIVE templates
   */
  router.post(
    `/createRecurring`,
    validateRequest(createRecurringSchema),
    (req: Request, res: Response, next: NextFunction) => CreateRecurringController(req as RecurringRequest, res, next),
    errorHandler
  );
  logger.debug("Route registered: POST /createRecurring");

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
   */
  router.post(
    `/acceptRecurring`,
    validateRequest(acceptRecurringSchema),
    (req: Request, res: Response, next: NextFunction) => AcceptRecurringController(req as RecurringRequest, res, next),
    errorHandler
  );
  logger.debug("Route registered: POST /acceptRecurring");

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
   */
  router.post(
    `/cancelRecurring`,
    validateRequest(cancelRecurringSchema),
    (req: Request, res: Response, next: NextFunction) => CancelRecurringController(req as RecurringRequest, res, next),
    errorHandler
  );
  logger.debug("Route registered: POST /cancelRecurring");

  /**
   * @swagger
   * /api/recurring/getRecurring:
   *   post:
   *     tags: [Recurring]
   *     summary: Get recurring transaction details
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - recurringID
   *               - accountID
   *             properties:
   *               recurringID:
   *                 type: string
   *                 format: uuid
   *               accountID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/getRecurring`,
    validateRequest(getRecurringSchema),
    (req: Request, res: Response, next: NextFunction) => GetRecurringController(req as RecurringRequest, res, next),
    errorHandler
  );
  logger.debug("Route registered: POST /getRecurring");

  logger.info("Recurring routes initialized successfully", {
    module: "recurringRoutes",
    routesCount: 4,
  });

  return router;
}
