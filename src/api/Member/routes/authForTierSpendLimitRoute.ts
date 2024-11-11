import express from "express";
import { AuthForTierSpendLimitController } from "../controllers/authForTierSpendLimit";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { authForTierSpendLimitSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function authForTierSpendLimitRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /authForTierSpendLimit:
   *   post:
   *     tags: [Members]
   *     summary: Authorize tier spend limit
   *     description: Validates if a member's tier permits the requested spend amount. Different tiers have different daily spend limits and secured/unsecured permissions.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - issuerAccountID
   *               - Amount
   *               - Denomination
   *               - securedCredex
   *             properties:
   *               issuerAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account attempting to spend
   *               Amount:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *                 description: Amount of the transaction
   *               Denomination:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Denomination of the transaction
   *               securedCredex:
   *                 type: boolean
   *                 description: Whether this is a secured credex transaction
   *     responses:
   *       200:
   *         description: Authorization successful
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
   *                     isAuthorized:
   *                       type: boolean
   *                       description: Whether the spend is authorized
   *                     availableAmount:
   *                       type: string
   *                       description: Remaining available amount in USD
   *                     memberTier:
   *                       type: integer
   *                       description: Member's current tier level
   *                 message:
   *                   type: string
   *                   description: Authorization status message
   *       400:
   *         description: Invalid input data
   *       403:
   *         description: Spend not authorized by tier limits
   *       404:
   *         description: Account not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/authForTierSpendLimit`,
    validateRequest(authForTierSpendLimitSchema),
    AuthForTierSpendLimitController,
    errorHandler
  );
  logger.debug("Route registered: POST /authForTierSpendLimit");

  return router;
}
