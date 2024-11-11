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
   *                 success:
   *                   type: boolean
   *                   example: true
   *                   description: Whether the operation was successful
   *                 data:
   *                   type: object
   *                   properties:
   *                     acceptedCredexIDs:
   *                       type: array
   *                       description: Successfully accepted Credex IDs
   *                       items:
   *                         type: string
   *                         format: uuid
   *                     summary:
   *                       type: object
   *                       properties:
   *                         accepted:
   *                           type: array
   *                           description: Successfully accepted Credex IDs
   *                           items:
   *                             type: string
   *                             format: uuid
   *                         alreadyAccepted:
   *                           type: array
   *                           description: Credex IDs that were already accepted
   *                           items:
   *                             type: string
   *                             format: uuid
   *                         failed:
   *                           type: array
   *                           description: Failed acceptance attempts
   *                           items:
   *                             type: object
   *                             properties:
   *                               credexID:
   *                                 type: string
   *                                 format: uuid
   *                               error:
   *                                 type: string
   *                     dashboard:
   *                       type: object
   *                       description: Updated dashboard information
   *                       nullable: true
   *                 message:
   *                   type: string
   *                   example: Bulk accept operation completed
   *                   description: Status message
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
