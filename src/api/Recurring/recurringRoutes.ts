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
 * components:
 *   schemas:
 *     RecurringResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             recurringID:
 *               type: string
 *               format: uuid
 *             frequency:
 *               type: string
 *               enum: [DAILY, WEEKLY, MONTHLY]
 *             nextRunDate:
 *               type: string
 *             status:
 *               type: string
 *             sourceAccountID:
 *               type: string
 *               format: uuid
 *             targetAccountID:
 *               type: string
 *               format: uuid
 *             amount:
 *               type: string
 *               description: For REGULAR templates
 *             denomination:
 *               type: string
 *               enum: [CXX, CAD, USD, XAU, ZWG]
 *               description: For REGULAR templates
 *             DCOgiveInCXX:
 *               type: string
 *               description: For DCO_GIVE templates
 *             DCOdenom:
 *               type: string
 *               enum: [CXX, CAD, USD, XAU, ZWG]
 *               description: For DCO_GIVE templates
 *         message:
 *           type: string
 */

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
   *                 example: "2024-01-01"
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
    (req: Request, res: Response, next: NextFunction) =>
      AcceptRecurringController(req as RecurringRequest, res, next),
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
    (req: Request, res: Response, next: NextFunction) =>
      CancelRecurringController(req as RecurringRequest, res, next),
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
    (req: Request, res: Response, next: NextFunction) =>
      GetRecurringController(req as RecurringRequest, res, next),
    errorHandler
  );
  logger.debug("Route registered: POST /getRecurring");

  logger.info("Recurring routes initialized successfully", {
    module: "recurringRoutes",
    routesCount: 4,
  });

  return router;
}
