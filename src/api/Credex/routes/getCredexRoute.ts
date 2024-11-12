import express from "express";
import { GetCredexController } from "../controllers/getCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { getCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function getCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Get Credex transaction details
   *     description: Retrieves detailed information about a specific Credex transaction, including its current state, amounts, and clearing information.
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
   *               - accountID
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the Credex to retrieve
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account requesting the Credex details
   *     responses:
   *       200:
   *         description: Credex details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Credex details retrieved successfully"
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
   *                           description: The credexID of the transaction
   *                         type:
   *                           type: string
   *                           enum: [CREDEX_RETRIEVED]
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
   *                             transactionType:
   *                               type: string
   *                               enum: [OWES, CLEARED, REQUESTS, OFFERS, DECLINED, CANCELLED]
   *                             debit:
   *                               type: boolean
   *                               description: Whether this is a debit transaction for the requesting account
   *                             counterpartyAccountName:
   *                               type: string
   *                             securerID:
   *                               type: string
   *                               format: uuid
   *                               nullable: true
   *                             securerName:
   *                               type: string
   *                               nullable: true
   *                             Denomination:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU, ZWG]
   *                             InitialAmount:
   *                               type: number
   *                             OutstandingAmount:
   *                               type: number
   *                             RedeemedAmount:
   *                               type: number
   *                             DefaultedAmount:
   *                               type: number
   *                             WrittenOffAmount:
   *                               type: number
   *                             formattedInitialAmount:
   *                               type: string
   *                             formattedOutstandingAmount:
   *                               type: string
   *                             formattedRedeemedAmount:
   *                               type: string
   *                             formattedDefaultedAmount:
   *                               type: string
   *                             formattedWrittenOffAmount:
   *                               type: string
   *                             acceptedAt:
   *                               type: string
   *                               format: date-time
   *                               nullable: true
   *                             declinedAt:
   *                               type: string
   *                               format: date-time
   *                               nullable: true
   *                             cancelledAt:
   *                               type: string
   *                               format: date-time
   *                               nullable: true
   *                             dueDate:
   *                               type: string
   *                               format: date
   *                               nullable: true
   *                             securedCredex:
   *                               type: boolean
   *                             clearedAgainst:
   *                               type: array
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   clearedAgainstCredexID:
   *                                     type: string
   *                                     format: uuid
   *                                   formattedClearedAmount:
   *                                     type: string
   *                                   formattedClearedAgainstCredexInitialAmount:
   *                                     type: string
   *                                   clearedAgainstCounterpartyAccountName:
   *                                     type: string
   *                     dashboard:
   *                       type: object
   *                       description: Full dashboard state after the action
   *                       nullable: true
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Invalid input parameters"
   *                   description: Human-friendly error message
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       enum: [VALIDATION_ERROR]
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
   *         description: Not authorized to view this Credex
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Not authorized to view this Credex"
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       enum: [FORBIDDEN]
   *                     details:
   *                       type: string
   *       404:
   *         description: Credex not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Credex not found"
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
    `/getCredex`,
    validateRequest(getCredexSchema),
    authenticatedHandler(GetCredexController)
  );
  logger.debug("Route registered: POST /getCredex");

  return router;
}
