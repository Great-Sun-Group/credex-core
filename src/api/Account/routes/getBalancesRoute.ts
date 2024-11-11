import express from "express";
import { GetBalancesController } from "../controllers/getBalances";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getBalancesSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function getBalancesRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/account/getBalances:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account balances
   *     description: Retrieves secured and unsecured balances for an account across all denominations
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to get balances for
   *     responses:
   *       200:
   *         description: Balances retrieved successfully
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
   *                     securedNetBalancesByDenom:
   *                       type: array
   *                       items:
   *                         type: string
   *                         description: Formatted balance with denomination (e.g. "100.00 USD")
   *                     unsecuredBalancesInDefaultDenom:
   *                       type: object
   *                       properties:
   *                         totalPayables:
   *                           type: string
   *                           description: Total payables in default denomination
   *                         totalReceivables:
   *                           type: string
   *                           description: Total receivables in default denomination
   *                         netPayRec:
   *                           type: string
   *                           description: Net payables/receivables in default denomination
   *                     netCredexAssetsInDefaultDenom:
   *                       type: string
   *                       description: Net credex assets in default denomination
   *                 message:
   *                   type: string
   *                   example: Account balances retrieved successfully
   *       400:
   *         description: Invalid input data or missing default denomination
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to view account balances
   *       404:
   *         description: Account not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/getBalances`,
    validateRequest(getBalancesSchema),
    authenticatedHandler(GetBalancesController),
    errorHandler
  );
  logger.debug("Route registered: POST /getBalances");

  return router;
}
