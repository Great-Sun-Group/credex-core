import express from "express";
import { CreateCredexController } from "../controllers/createCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { createCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function createCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/credex/createCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Create a new Credex transaction
   *     description: Creates a new Credex transaction between two accounts with optional security and due date
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
   *               - credexType
   *               - OFFERSorREQUESTS
   *               - securedCredex
   *             properties:
   *               memberID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member creating the Credex
   *               issuerAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account issuing the Credex
   *               receiverAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account receiving the Credex
   *               Denomination:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Denomination of the transaction
   *               InitialAmount:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *                 description: Amount of the transaction
   *               credexType:
   *                 type: string
   *                 enum: [PURCHASE, GIFT, DCO_GIVE, DCO_RECEIVE]
   *                 description: Type of Credex transaction
   *               OFFERSorREQUESTS:
   *                 type: string
   *                 enum: [OFFERS, REQUESTS]
   *                 description: Whether this is an offer or request
   *               securedCredex:
   *                 type: boolean
   *                 description: Whether this Credex is secured
   *               dueDate:
   *                 type: string
   *                 format: date
   *                 pattern: ^\d{4}-\d{2}-\d{2}$
   *                 description: Optional due date for the Credex
   *     responses:
   *       201:
   *         description: Credex created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     credexID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the created Credex
   *                     issuerAccountID:
   *                       type: string
   *                       format: uuid
   *                     receiverAccountID:
   *                       type: string
   *                       format: uuid
   *                     Denomination:
   *                       type: string
   *                       enum: [CXX, CAD, USD, XAU, ZWG]
   *                     InitialAmount:
   *                       type: number
   *                     OutstandingAmount:
   *                       type: number
   *                     credexType:
   *                       type: string
   *                       enum: [PURCHASE, GIFT, DCO_GIVE, DCO_RECEIVE]
   *                     status:
   *                       type: string
   *                       enum: [PENDING, ACCEPTED, DECLINED, CANCELLED]
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                 message:
   *                   type: string
   *                   example: Credex created successfully
   *       400:
   *         description: Invalid input data or validation error
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to create Credex for this account
   *       404:
   *         description: Account not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/createCredex`,
    validateRequest(createCredexSchema),
    authenticatedHandler(CreateCredexController)
  );
  logger.debug("Route registered: POST /createCredex");

  return router;
}
