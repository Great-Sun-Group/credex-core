import express from "express";
import { GetLedgerController } from "../controllers/getLedger";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getLedgerSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function getLedgerRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getLedger:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account ledger
   *     description: Retrieves transaction history for an account with pagination support
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
   *                 description: ID of the account to get ledger for
   *               numRows:
   *                 type: integer
   *                 minimum: 1
   *                 default: 10
   *                 description: Number of transactions to return
   *               startRow:
   *                 type: integer
   *                 minimum: 0
   *                 default: 0
   *                 description: Starting row for pagination
   *     responses:
   *       200:
   *         description: Ledger retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   description: Array of ledger entries
   *                   items:
   *                     type: object
   *                     properties:
   *                       credexID:
   *                         type: string
   *                         format: uuid
   *                         description: ID of the credex transaction
   *                       transactionType:
   *                         type: string
   *                         enum: [OWES, CLEARED, REQUESTS, OFFERS, DECLINED, CANCELLED]
   *                         description: Type of transaction
   *                       formattedInitialAmount:
   *                         type: string
   *                         description: Formatted amount with denomination (e.g. "100.00 USD")
   *                       counterpartyAccountName:
   *                         type: string
   *                         description: Name of the counterparty account
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                         description: When the transaction was created
   *                 message:
   *                   type: string
   *                   example: Ledger retrieved successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to view account ledger
   *       404:
   *         description: Account not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/getLedger`,
    validateRequest(getLedgerSchema),
    authenticatedHandler(GetLedgerController),
    errorHandler
  );
  logger.debug("Route registered: POST /getLedger");

  return router;
}
