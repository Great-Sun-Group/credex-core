import express from "express";
import { OfferCredexController } from "./controllers/offerCredex";
import { AcceptCredexController } from "./controllers/acceptCredex";
import { AcceptCredexBulkController } from "./controllers/acceptCredexBulk";
import { DeclineCredexController } from "./controllers/declineCredex";
import { CancelCredexController } from "./controllers/cancelCredex";
import { GetCredexController } from "./controllers/getCredex";
import { GetLedgerController } from "./controllers/getLedger";
import { validateRequest } from "../../middleware/validateRequest";
import {
  offerCredexSchema,
  acceptCredexSchema,
  declineCredexSchema,
  cancelCredexSchema,
  getCredexSchema,
  getLedgerSchema,
} from "./credexValidationSchemas";
import logger from "../../utils/logger";

export default function CredexRoutes(jsonParser: express.RequestHandler) {
  const router = express.Router();
  logger.info("Initializing Credex routes");

  /**
   * @swagger
   * /api/v1/offerCredex:
   *   post:
   *     summary: Offer a new Credex
   *     tags: [Credex]
   *     security:
   *       - bearerAuth: []
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    `/offerCredex`,
    jsonParser,
    validateRequest(offerCredexSchema),
    (req: express.Request, res: express.Response) => {
      logger.debug("POST /offerCredex called", { requestId: req.id });
      OfferCredexController(req, res);
    }
  );

  /**
   * @swagger
   * /api/v1/acceptCredex:
   *   put:
   *     summary: Accept a Credex offer
   *     tags: [Credex]
   *     security:
   *       - bearerAuth: []
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.put(
    `/acceptCredex`,
    jsonParser,
    validateRequest(acceptCredexSchema),
    (req: express.Request, res: express.Response) => {
      logger.debug("PUT /acceptCredex called", { requestId: req.id });
      AcceptCredexController(req, res);
    }
  );

  /**
   * @swagger
   * /api/v1/acceptCredexBulk:
   *   put:
   *     summary: Accept multiple Credex offers in bulk
   *     tags: [Credex]
   *     security:
   *       - bearerAuth: []
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.put(
    `/acceptCredexBulk`,
    jsonParser,
    validateRequest({
      credexIDs: {
        sanitizer: (value: any) =>
          Array.isArray(value)
            ? value.map(acceptCredexSchema.credexID.sanitizer)
            : value,
        validator: (value: any) => {
          if (!Array.isArray(value)) {
            return { isValid: false, message: "credexIDs must be an array" };
          }
          for (const credexID of value) {
            const result = acceptCredexSchema.credexID.validator(credexID);
            if (!result.isValid) {
              return { isValid: false, message: `Invalid credexID: ${result.message}` };
            }
          }
          return { isValid: true };
        },
      },
      signerID: acceptCredexSchema.signerID,
    }),
    (req: express.Request, res: express.Response) => {
      logger.debug("PUT /acceptCredexBulk called", { requestId: req.id });
      AcceptCredexBulkController(req, res);
    }
  );

  /**
   * @swagger
   * /api/v1/declineCredex:
   *   put:
   *     summary: Decline a Credex offer
   *     tags: [Credex]
   *     security:
   *       - bearerAuth: []
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.put(
    `/declineCredex`,
    jsonParser,
    validateRequest(declineCredexSchema),
    (req: express.Request, res: express.Response) => {
      logger.debug("PUT /declineCredex called", { requestId: req.id });
      DeclineCredexController(req, res);
    }
  );

  /**
   * @swagger
   * /api/v1/cancelCredex:
   *   put:
   *     summary: Cancel a Credex offer
   *     tags: [Credex]
   *     security:
   *       - bearerAuth: []
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.put(
    `/cancelCredex`,
    jsonParser,
    validateRequest(cancelCredexSchema),
    (req: express.Request, res: express.Response) => {
      logger.debug("PUT /cancelCredex called", { requestId: req.id });
      CancelCredexController(req, res);
    }
  );

  /**
   * @swagger
   * /api/v1/getCredex:
   *   get:
   *     summary: Get Credex details
   *     tags: [Credex]
   *     security:
   *       - bearerAuth: []
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Credex not found
   */
  router.get(
    `/getCredex`,
    validateRequest(getCredexSchema, "query"),
    (req: express.Request, res: express.Response) => {
      logger.debug("GET /getCredex called", { requestId: req.id });
      GetCredexController(req, res);
    }
  );

  /**
   * @swagger
   * /api/v1/getLedger:
   *   get:
   *     summary: Get account ledger
   *     tags: [Credex]
   *     security:
   *       - bearerAuth: []
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    `/getLedger`,
    validateRequest(getLedgerSchema, "query"),
    (req: express.Request, res: express.Response) => {
      logger.debug("GET /getLedger called", { requestId: req.id });
      GetLedgerController(req, res);
    }
  );

  logger.info("Credex routes initialized successfully");
  return router;
}
