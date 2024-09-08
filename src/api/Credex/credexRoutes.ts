import express from "express";
import { apiVersionOneRoute } from "../../index";
import { OfferCredexController } from "./controllers/offerCredex";
import { AcceptCredexController } from "./controllers/acceptCredex";
import { AcceptCredexBulkController } from "./controllers/acceptCredexBulk";
import { DeclineCredexController } from "./controllers/declineCredex";
import { CancelCredexController } from "./controllers/cancelCredex";
import { GetCredexController } from "./controllers/getCredex";
import { GetLedgerController } from "./controllers/getLedger";

export default function CredexRoutes(
  app: express.Application,
  jsonParser: any
) {
  /**
   * @swagger
   * /api/v1/offerCredex:
   *   post:
   *     summary: Offer a new Credex
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - memberID
   *               - issuerAccountID
   *               - receiverAccountID
   *               - Denomination
   *               - InitialAmount
   *             properties:
   *               memberID:
   *                 type: string
   *               issuerAccountID:
   *                 type: string
   *               receiverAccountID:
   *                 type: string
   *               Denomination:
   *                 type: string
   *               InitialAmount:
   *                 type: number
   *               credexType:
   *                 type: string
   *               securedCredex:
   *                 type: boolean
   *               dueDate:
   *                 type: string
   *                 format: date
   *     responses:
   *       200:
   *         description: Credex offered successfully
   *       400:
   *         description: Bad request
   */
  app.post(
    `${apiVersionOneRoute}offerCredex`,
    jsonParser,
    OfferCredexController
  );

  /**
   * @swagger
   * /api/v1/acceptCredex:
   *   put:
   *     summary: Accept a Credex offer
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *               - signerID
   *             properties:
   *               credexID:
   *                 type: string
   *               signerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Credex accepted successfully
   *       400:
   *         description: Bad request
   */
  app.put(
    `${apiVersionOneRoute}acceptCredex`,
    jsonParser,
    AcceptCredexController
  );

  /**
   * @swagger
   * /api/v1/acceptCredexBulk:
   *   put:
   *     summary: Accept multiple Credex offers in bulk
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexIDs
   *               - signerID
   *             properties:
   *               credexIDs:
   *                 type: array
   *                 items:
   *                   type: string
   *               signerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Credexes accepted successfully
   *       400:
   *         description: Bad request
   */
  app.put(
    `${apiVersionOneRoute}acceptCredexBulk`,
    jsonParser,
    AcceptCredexBulkController
  );

  /**
   * @swagger
   * /api/v1/declineCredex:
   *   put:
   *     summary: Decline a Credex offer
   *     tags: [Credex]
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
   *     responses:
   *       200:
   *         description: Credex declined successfully
   *       400:
   *         description: Bad request
   */
  app.put(
    `${apiVersionOneRoute}declineCredex`,
    jsonParser,
    DeclineCredexController
  );

  /**
   * @swagger
   * /api/v1/cancelCredex:
   *   put:
   *     summary: Cancel a Credex offer
   *     tags: [Credex]
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
   *     responses:
   *       200:
   *         description: Credex cancelled successfully
   *       400:
   *         description: Bad request
   */
  app.put(
    `${apiVersionOneRoute}cancelCredex`,
    jsonParser,
    CancelCredexController
  );

  /**
   * @swagger
   * /api/v1/getCredex:
   *   get:
   *     summary: Get Credex details
   *     tags: [Credex]
   *     parameters:
   *       - in: query
   *         name: credexID
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Credex details retrieved successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Credex not found
   */
  app.get(`${apiVersionOneRoute}getCredex`, jsonParser, GetCredexController);

  /**
   * @swagger
   * /api/v1/getLedger:
   *   get:
   *     summary: Get account ledger
   *     tags: [Credex]
   *     parameters:
   *       - in: query
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: numRows
   *         schema:
   *           type: integer
   *       - in: query
   *         name: startRow
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Ledger retrieved successfully
   *       400:
   *         description: Bad request
   */
  app.get(`${apiVersionOneRoute}getLedger`, jsonParser, GetLedgerController);
}
