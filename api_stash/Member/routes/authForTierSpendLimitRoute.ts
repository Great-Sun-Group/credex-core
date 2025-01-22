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
   *                 message:
   *                   type: string
   *                   description: Human-friendly authorization status message
   *                   example: Authorization granted
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: Account ID that was checked
   *                         type:
   *                           type: string
   *                           enum: [SPEND_AUTHORIZED, ERROR_UNAUTHORIZED]
   *                           description: Type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the account that initiated the check
   *                         details:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the member
   *                             isAuthorized:
   *                               type: boolean
   *                               description: Whether the spend is authorized
   *                             availableAmount:
   *                               type: string
   *                               description: Remaining available amount in USD
   *                             memberTier:
   *                               type: integer
   *                               description: Member's current tier level
   *                             amount:
   *                               type: string
   *                               description: Requested spend amount
   *                             denomination:
   *                               type: string
   *                               description: Requested denomination
   *                             securedCredex:
   *                               type: boolean
   *                               description: Whether this was a secured credex request
   *                             currentSpendUSD:
   *                               type: number
   *                               description: Current daily spend in USD
   *                             tierLimitUSD:
   *                               type: number
   *                               description: Daily spend limit in USD for current tier
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard since this is just an auth check
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Error message explaining the validation failure
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: MISSING_PARAMS
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       403:
   *         description: Spend not authorized by tier limits
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Spend amount exceeds tier limit
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_UNAUTHORIZED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: TIER_LIMIT_EXCEEDED
   *                             reason:
   *                               type: string
   *                               description: Detailed error message
   *                     dashboard:
   *                       type: object
   *       404:
   *         description: Account not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account not found
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_NOT_FOUND]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: NOT_FOUND
   *                             reason:
   *                               type: string
   *                               description: Detailed error message
   *                     dashboard:
   *                       type: object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_INTERNAL]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: system
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INTERNAL_ERROR
   *                             reason:
   *                               type: string
   *                               description: Internal error details
   *                             suggestion:
   *                               type: string
   *                               example: Please try again or contact support
   *                     dashboard:
   *                       type: object
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
