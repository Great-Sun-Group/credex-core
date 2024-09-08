import express from "express";
import { apiVersionOneRoute } from "../../index";
import { RequestRecurringController } from "./controllers/requestRecurring";
import { AcceptRecurringController } from "./controllers/acceptRecurring";
import { DeclineRecurringController } from "./controllers/cancelRecurring";
import { errorHandler } from "../../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import {
  requestRecurringSchema,
  acceptRecurringSchema,
  cancelRecurringSchema,
} from "./avatarValidationSchemas";

export default function RecurringRoutes(
  app: express.Application,
  jsonParser: express.RequestHandler
) {
  /**
   * @swagger
   * /api/v1/requestRecurring:
   *   post:
   *     summary: Request a recurring payment
   *     tags: [Recurring]
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
   */
  app.post(
    `${apiVersionOneRoute}requestRecurring`,
    jsonParser,
    validateRequest(requestRecurringSchema),
    RequestRecurringController,
    errorHandler
  );

  /**
   * @swagger
   * /api/v1/acceptRecurring:
   *   put:
   *     summary: Accept a recurring payment request
   *     tags: [Recurring]
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
   */
  app.put(
    `${apiVersionOneRoute}acceptRecurring`,
    jsonParser,
    validateRequest(acceptRecurringSchema),
    AcceptRecurringController,
    errorHandler
  );

  /**
   * @swagger
   * /api/v1/cancelRecurring:
   *   delete:
   *     summary: Cancel a recurring payment
   *     tags: [Recurring]
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
   */
  app.delete(
    `${apiVersionOneRoute}cancelRecurring`,
    jsonParser,
    validateRequest(cancelRecurringSchema),
    DeclineRecurringController,
    errorHandler
  );
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
