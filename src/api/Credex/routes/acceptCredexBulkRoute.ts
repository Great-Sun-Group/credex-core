import express from "express";
import { AcceptCredexBulkController } from "../controllers/acceptCredexBulk";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { acceptCredexBulkSchema, acceptCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function acceptCredexBulkRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/credex/acceptCredexBulk:
   *   post:
   *     tags: [Credex]
   *     summary: Accept multiple Credex transactions
   *     description: Accepts multiple pending Credex transactions in a single request
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
   *                 items:
   *                   type: string
   *                   format: uuid
   *                 description: Array of Credex IDs to accept
   *                 minItems: 1
   *     responses:
   *       200:
   *         description: Bulk accept operation completed
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
   *                     accepted:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           credexID:
   *                             type: string
   *                             format: uuid
   *                           status:
   *                             type: string
   *                             enum: [ACCEPTED]
   *                           acceptedAt:
   *                             type: string
   *                             format: date-time
   *                     failed:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           credexID:
   *                             type: string
   *                             format: uuid
   *                           error:
   *                             type: string
   *                             description: Reason for failure
   *                 message:
   *                   type: string
   *                   example: Bulk accept operation completed
   *       400:
   *         description: Invalid input data or no valid Credex IDs provided
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to accept one or more Credex transactions
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/acceptCredexBulk`,
    validateRequest(acceptCredexBulkSchema),
    authenticatedHandler(AcceptCredexBulkController)
  );
  logger.debug("Route registered: POST /acceptCredexBulk");

  return router;
}
