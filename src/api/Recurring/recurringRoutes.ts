import express from "express";
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
   *     description: Create a new recurring transaction schedule
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
   *               - amount
   *               - denomination
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
   *               amount:
   *                 type: number
   *               denomination:
   *                 type: string
   *               frequency:
   *                 type: string
   *                 enum: [DAILY, WEEKLY, MONTHLY]
   *               startDate:
   *                 type: string
   *                 format: date
   *               duration:
   *                 type: integer
   *               securedCredex:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Recurring transaction created successfully
   *       400:
   *         description: Invalid input data
   *       403:
   *         description: Unauthorized
   */
  router.post(
    `/createRecurring`,
    validateRequest(createRecurringSchema),
    CreateRecurringController,
    errorHandler
  );
  logger.debug("Route registered: POST /createRecurring");

  /**
   * @swagger
   * /api/recurring/acceptRecurring:
   *   post:
   *     tags: [Recurring]
   *     summary: Accept a recurring transaction
   *     description: Accept a pending recurring transaction request
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
   *     responses:
   *       200:
   *         description: Recurring transaction accepted successfully
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Recurring transaction not found
   */
  router.post(
    `/acceptRecurring`,
    validateRequest(acceptRecurringSchema),
    AcceptRecurringController,
    errorHandler
  );
  logger.debug("Route registered: POST /acceptRecurring");

  /**
   * @swagger
   * /api/recurring/cancelRecurring:
   *   post:
   *     tags: [Recurring]
   *     summary: Cancel a recurring transaction
   *     description: Cancel an active recurring transaction
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
   *     responses:
   *       200:
   *         description: Recurring transaction cancelled successfully
   *       400:
   *         description: Invalid input data
   *       403:
   *         description: Unauthorized
   *       404:
   *         description: Recurring transaction not found
   */
  router.post(
    `/cancelRecurring`,
    validateRequest(cancelRecurringSchema),
    CancelRecurringController,
    errorHandler
  );
  logger.debug("Route registered: POST /cancelRecurring");

  /**
   * @swagger
   * /api/recurring/getRecurring:
   *   post:
   *     tags: [Recurring]
   *     summary: Get recurring transaction details
   *     description: Retrieve details of a recurring transaction
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
   *     responses:
   *       200:
   *         description: Recurring transaction details retrieved successfully
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Recurring transaction not found
   */
  router.post(
    `/getRecurring`,
    validateRequest(getRecurringSchema),
    GetRecurringController,
    errorHandler
  );
  logger.debug("Route registered: POST /getRecurring");

  logger.info("Recurring routes initialized successfully", {
    module: "recurringRoutes",
    routesCount: 4,
  });

  return router;
}
