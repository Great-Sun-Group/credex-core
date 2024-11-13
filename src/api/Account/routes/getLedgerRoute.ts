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
   *     description: Retrieves paginated transaction history for an account
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
   *                 message:
   *                   type: string
   *                   example: Ledger entries retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The account ID
   *                         type:
   *                           type: string
   *                           enum: [LEDGER_RETRIEVED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member requesting the ledger
   *                         details:
   *                           type: object
   *                           properties:
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                             ledger:
   *                               type: array
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   credexID:
   *                                     type: string
   *                                     format: uuid
   *                                     description: ID of the credex transaction
   *                                   timestamp:
   *                                     type: string
   *                                     format: date-time
   *                                     description: When the transaction occurred
   *                                   type:
   *                                     type: string
   *                                     description: Type of transaction
   *                                   amount:
   *                                     type: string
   *                                     description: Transaction amount
   *                                   denomination:
   *                                     type: string
   *                                     description: Transaction denomination
   *                                   description:
   *                                     type: string
   *                                     description: Human-readable description
   *                                   counterpartyAccountName:
   *                                     type: string
   *                                     description: Name of the counterparty account
   *                                   formattedAmount:
   *                                     type: string
   *                                     description: Formatted amount with denomination
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         ledger:
   *                           type: array
   *                           description: Array of ledger entries matching the action details
   *                         pagination:
   *                           type: object
   *                           properties:
   *                             startRow:
   *                               type: integer
   *                               description: Current starting row
   *                             numRows:
   *                               type: integer
   *                               description: Number of rows returned
   *                             hasMore:
   *                               type: boolean
   *                               description: Whether more entries are available
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invalid pagination parameters
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INVALID_PAGINATION
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Authentication required
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
   *                           example: system
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: NO_AUTH
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       403:
   *         description: Not authorized to view account ledger
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Unauthorized access to account
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
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
   *                               example: UNAUTHORIZED_ACCESS
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error while retrieving ledger
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INTERNAL_ERROR
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
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
