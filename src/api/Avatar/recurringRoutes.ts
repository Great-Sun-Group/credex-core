import express from "express";
import { RequestRecurringController } from "./controllers/requestRecurring";
import { AcceptRecurringController } from "./controllers/acceptRecurring";
import { DeclineRecurringController } from "./controllers/cancelRecurring";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import {
  requestRecurringSchema,
  acceptRecurringSchema,
  cancelRecurringSchema,
} from "./avatarValidationSchemas";
import logger from "../../utils/logger";

export default function RecurringRoutes(jsonParser: express.RequestHandler) {
  const router = express.Router();
  logger.info("Initializing Recurring Routes");

  /**
   * @swagger
   * /v1/requestRecurring:
   *   post:
   *     summary: Request a recurring payment
   *     tags: [Recurring]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RequestRecurring'
   *     responses:
   *       200:
   *         description: Recurring payment requested successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    `/requestRecurring`,
    jsonParser,
    validateRequest(requestRecurringSchema),
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.debug("POST /requestRecurring called", { requestId: req.id });
      RequestRecurringController(req, res);
    },
    errorHandler
  );

  /**
   * @swagger
   * /v1/acceptRecurring:
   *   put:
   *     summary: Accept a recurring payment request
   *     tags: [Recurring]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AcceptRecurring'
   *     responses:
   *       200:
   *         description: Recurring payment accepted successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.put(
    `/acceptRecurring`,
    jsonParser,
    validateRequest(acceptRecurringSchema),
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.debug("PUT /acceptRecurring called", { requestId: req.id });
      AcceptRecurringController(req, res);
    },
    errorHandler
  );

  /**
   * @swagger
   * /v1/cancelRecurring:
   *   delete:
   *     summary: Cancel a recurring payment
   *     tags: [Recurring]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CancelRecurring'
   *     responses:
   *       200:
   *         description: Recurring payment cancelled successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.delete(
    `/cancelRecurring`,
    jsonParser,
    validateRequest(cancelRecurringSchema),
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.debug("DELETE /cancelRecurring called", { requestId: req.id });
      DeclineRecurringController(req, res);
    },
    errorHandler
  );

  logger.info("Recurring Routes initialized");
  return router;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     RequestRecurring:
 *       type: object
 *       required:
 *         - signerMemberID
 *         - requestorAccountID
 *         - counterpartyAccountID
 *         - InitialAmount
 *         - Denomination
 *         - nextPayDate
 *         - daysBetweenPays
 *       properties:
 *         signerMemberID:
 *           type: string
 *           format: uuid
 *         requestorAccountID:
 *           type: string
 *           format: uuid
 *         counterpartyAccountID:
 *           type: string
 *           format: uuid
 *         InitialAmount:
 *           type: number
 *         Denomination:
 *           type: string
 *         nextPayDate:
 *           type: string
 *           format: date
 *         daysBetweenPays:
 *           type: integer
 *         securedCredex:
 *           type: boolean
 *         credspan:
 *           type: integer
 *           minimum: 7
 *           maximum: 35
 *         remainingPays:
 *           type: integer
 *           minimum: 0
 *     AcceptRecurring:
 *       type: object
 *       required:
 *         - avatarID
 *         - signerID
 *       properties:
 *         avatarID:
 *           type: string
 *           format: uuid
 *         signerID:
 *           type: string
 *           format: uuid
 *     CancelRecurring:
 *       type: object
 *       required:
 *         - signerID
 *         - cancelerAccountID
 *         - avatarID
 *       properties:
 *         signerID:
 *           type: string
 *           format: uuid
 *         cancelerAccountID:
 *           type: string
 *           format: uuid
 *         avatarID:
 *           type: string
 *           format: uuid
 */
