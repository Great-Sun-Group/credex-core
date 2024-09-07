import express from "express";
import { apiVersionOneRoute } from "../../index";
import { RequestRecurringController } from "./controllers/requestRecurring";
import { AcceptRecurringController } from "./controllers/acceptRecurring";
import { DeclineRecurringController } from "./controllers/cancelRecurring";

export default function RecurringRoutes(
  app: express.Application,
  jsonParser: any
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
   *             type: object
   *             required:
   *               - signerMemberID
   *               - requestorAccountID
   *               - counterpartyAccountID
   *               - InitialAmount
   *               - Denomination
   *               - nextPayDate
   *               - daysBetweenPays
   *             properties:
   *               signerMemberID:
   *                 type: string
   *               requestorAccountID:
   *                 type: string
   *               counterpartyAccountID:
   *                 type: string
   *               InitialAmount:
   *                 type: number
   *               Denomination:
   *                 type: string
   *               nextPayDate:
   *                 type: string
   *                 format: date
   *               daysBetweenPays:
   *                 type: integer
   *               securedCredex:
   *                 type: boolean
   *               credspan:
   *                 type: integer
   *               remainingPays:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Recurring payment requested successfully
   *       400:
   *         description: Bad request
   */
  app.post(
    `${apiVersionOneRoute}requestRecurring`,
    jsonParser,
    RequestRecurringController
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
   *             type: object
   *             required:
   *               - avatarID
   *               - signerID
   *             properties:
   *               avatarID:
   *                 type: string
   *               signerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Recurring payment accepted successfully
   *       400:
   *         description: Bad request
   */
  app.put(
    `${apiVersionOneRoute}acceptRecurring`,
    jsonParser,
    AcceptRecurringController
  );

  /**
   * @swagger
   * /api/v1/cancelRecurring:
   *   put:
   *     summary: Cancel a recurring payment
   *     tags: [Recurring]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - signerID
   *               - cancelerAccountID
   *               - avatarID
   *             properties:
   *               signerID:
   *                 type: string
   *               cancelerAccountID:
   *                 type: string
   *               avatarID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Recurring payment cancelled successfully
   *       400:
   *         description: Bad request
   */
  app.put(
    `${apiVersionOneRoute}cancelRecurring`,
    jsonParser,
    DeclineRecurringController
  );
}
