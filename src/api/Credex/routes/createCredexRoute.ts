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
   * /createCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Create a new Credex transaction
   *     description: Creates a new Credex transaction between two accounts with optional security and due date. Requires authentication.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - issuerAccountID
   *               - receiverAccountID
   *               - Denomination
   *               - InitialAmount
   *               - credexType
   *               - OFFERSorREQUESTS
   *               - securedCredex
   *             properties:
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
   *                 description: Optional due date for unsecured Credex
   *     responses:
   *       200:
   *         description: Credex created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Secured credex for $2.58 USD offered to Vimbisopay: Trust."
   *                   description: Human-friendly message describing the action
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The credexID of the created transaction
   *                         type:
   *                           type: string
   *                           enum: [CREDEX_CREATED]
   *                           description: Business action type
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: MemberID/AccountID who performed the action
   *                         details:
   *                           type: object
   *                           properties:
   *                             issuerAccountID:
   *                               type: string
   *                               format: uuid
   *                             receiverAccountID:
   *                               type: string
   *                               format: uuid
   *                             Denomination:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU, ZWG]
   *                             InitialAmount:
   *                               type: number
   *                             formattedInitialAmount:
   *                               type: string
   *                             credexType:
   *                               type: string
   *                             OFFERSorREQUESTS:
   *                               type: string
   *                             securedCredex:
   *                               type: boolean
   *                             dueDate:
   *                               type: string
   *                               format: date
   *                               nullable: true
   *                             cxxMultiplier:
   *                               type: number
   *                     dashboard:
   *                       type: object
   *                       description: Full dashboard state after the action
   *                       nullable: true
   *       400:
   *         description: Invalid input data or validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Invalid input: Issuer and receiver cannot be the same account"
   *                   description: Human-friendly error message
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       enum: [VALIDATION_ERROR, INVALID_AMOUNT, INVALID_DATE]
   *                       description: Machine-readable error code
   *                     details:
   *                       type: string
   *                       description: Detailed error information
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Authentication required"
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       enum: [UNAUTHORIZED]
   *                     details:
   *                       type: string
   *       403:
   *         description: Not authorized or insufficient tier level
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Insufficient membership tier for secured credex"
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       enum: [FORBIDDEN, INSUFFICIENT_TIER]
   *                     details:
   *                       type: string
   *       404:
   *         description: Account not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Account not found"
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       enum: [NOT_FOUND]
   *                     details:
   *                       type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Internal server error"
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       enum: [INTERNAL_ERROR]
   *                     details:
   *                       type: string
   */
  router.post(
    `/createCredex`,
    validateRequest(createCredexSchema),
    authenticatedHandler(CreateCredexController)
  );
  logger.debug("Route registered: POST /createCredex");

  return router;
}
