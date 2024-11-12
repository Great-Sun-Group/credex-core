import express from "express";
import { AcceptCredexBulkController } from "../controllers/acceptCredexBulk";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { acceptCredexBulkSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function acceptCredexBulkRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /acceptCredexBulk:
   *   post:
   *     tags: [Credex]
   *     summary: Accept multiple Credex transactions
   *     description: Accepts multiple pending Credex transactions in a single request. Requires authentication.
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
   *             properties:
   *               credexIDs:
   *                 type: array
   *                 description: Array of Credex IDs to accept
   *                 minItems: 1
   *                 items:
   *                   type: string
   *                   format: uuid
   *     responses:
   *       200:
   *         description: Bulk accept operation completed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Successfully processed 5 out of 7 Credex transactions"
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
   *                           nullable: true
   *                           description: Null for bulk operations
   *                         type:
   *                           type: string
   *                           enum: [CREDEX_BULK_ACCEPTED]
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
   *                             summary:
   *                               type: object
   *                               properties:
   *                                 accepted:
   *                                   type: array
   *                                   description: Successfully accepted Credex IDs
   *                                   items:
   *                                     type: string
   *                                     format: uuid
   *                                 alreadyAccepted:
   *                                   type: array
   *                                   description: Credex IDs that were already accepted
   *                                   items:
   *                                     type: string
   *                                     format: uuid
   *                                 failed:
   *                                   type: array
   *                                   description: Failed acceptance attempts
   *                                   items:
   *                                     type: object
   *                                     properties:
   *                                       credexID:
   *                                         type: string
   *                                         format: uuid
   *                                       error:
   *                                         type: string
   *                             totalProcessed:
   *                               type: number
   *                               description: Total number of Credex transactions processed
   *                             successCount:
   *                               type: number
   *                               description: Number of successfully processed transactions
   *                             failureCount:
   *                               type: number
   *                               description: Number of failed transactions
   *                     dashboard:
   *                       type: object
   *                       description: Full dashboard state after all actions
   *                       nullable: true
   *       400:
   *         description: Invalid input data or no valid Credex IDs provided
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Invalid input: No valid Credex IDs provided"
   *                   description: Human-friendly error message
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
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
   *                               enum: [VALIDATION_ERROR, NO_VALID_IDS]
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                             suggestion:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       nullable: true
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
   *                           enum: [system]
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               enum: [UNAUTHORIZED]
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       nullable: true
   *       403:
   *         description: Not authorized to accept one or more Credex transactions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Not authorized to accept one or more Credex transactions"
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
   *                               enum: [FORBIDDEN]
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       nullable: true
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
   *                           enum: [system]
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               enum: [INTERNAL_ERROR]
   *                             reason:
   *                               type: string
   *                             suggestion:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       nullable: true
   */
  router.post(
    `/acceptCredexBulk`,
    validateRequest(acceptCredexBulkSchema),
    authenticatedHandler(AcceptCredexBulkController)
  );
  logger.debug("Route registered: POST /acceptCredexBulk");

  return router;
}
