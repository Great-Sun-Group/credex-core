import express from "express";
import { CreateCredexController } from "./controllers/createCredex";
import { AcceptCredexController } from "./controllers/acceptCredex";
import { AcceptCredexBulkController } from "./controllers/acceptCredexBulk";
import { DeclineCredexController } from "./controllers/declineCredex";
import { CancelCredexController } from "./controllers/cancelCredex";
import { GetCredexController } from "./controllers/getCredex";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createCredexSchema,
  acceptCredexSchema,
  declineCredexSchema,
  cancelCredexSchema,
  getCredexSchema,
} from "./credexValidationSchemas";
import logger from "../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Credex
 *   description: Credex transaction operations
 */

export default function CredexRoutes() {
  const router = express.Router();
  logger.info("Initializing Credex routes");

  /**
   * @swagger
   * /api/credex/createCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Create a new Credex transaction
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
   *               - credexType
   *               - OFFERSorREQUESTS
   *               - securedCredex
   *             properties:
   *               memberID:
   *                 type: string
   *                 format: uuid
   *               issuerAccountID:
   *                 type: string
   *                 format: uuid
   *               receiverAccountID:
   *                 type: string
   *                 format: uuid
   *               Denomination:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *               InitialAmount:
   *                 type: number
   *                 minimum: 0
   *               credexType:
   *                 type: string
   *                 enum: [PURCHASE, GIFT, DCO_GIVE, DCO_RECEIVE]
   *               OFFERSorREQUESTS:
   *                 type: string
   *                 enum: [OFFERS, REQUESTS]
   *               securedCredex:
   *                 type: boolean
   *               dueDate:
   *                 type: string
   *                 format: date
   *                 pattern: ^\d{4}-\d{2}-\d{2}$
   */
  router.post(
    `/createCredex`,
    validateRequest(createCredexSchema),
    CreateCredexController
  );
  logger.debug("Route registered: POST /createCredex");

  /**
   * @swagger
   * /api/credex/acceptCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Accept a Credex transaction
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
   *                 format: uuid
   *               signerID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/acceptCredex`,
    validateRequest(acceptCredexSchema),
    AcceptCredexController
  );
  logger.debug("Route registered: POST /acceptCredex");

  /**
   * @swagger
   * /api/credex/acceptCredexBulk:
   *   post:
   *     tags: [Credex]
   *     summary: Accept multiple Credex transactions
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexIDs
   *             properties:
   *               credexIDs:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: uuid
   */
  router.post(
    `/acceptCredexBulk`,
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
              return {
                isValid: false,
                message: `Invalid credexID: ${result.message}`,
              };
            }
          }
          return { isValid: true };
        },
      }
    }),
    AcceptCredexBulkController
  );
  logger.debug("Route registered: POST /acceptCredexBulk");

  /**
   * @swagger
   * /api/credex/declineCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Decline a Credex transaction
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
   *                 format: uuid
   *               signerID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/declineCredex`,
    validateRequest(declineCredexSchema),
    DeclineCredexController
  );
  logger.debug("Route registered: POST /declineCredex");

  /**
   * @swagger
   * /api/credex/cancelCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Cancel a Credex transaction
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
   *                 format: uuid
   *               signerID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/cancelCredex`,
    validateRequest(cancelCredexSchema),
    CancelCredexController
  );
  logger.debug("Route registered: POST /cancelCredex");

  /**
   * @swagger
   * /api/credex/getCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Get Credex transaction details
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *               - accountID
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   *               accountID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/getCredex`,
    validateRequest(getCredexSchema),
    GetCredexController
  );
  logger.debug("Route registered: POST /getCredex");

  logger.info("Credex routes initialized successfully", {
    module: "credexRoutes",
    routesCount: 6,
  });

  return router;
}
