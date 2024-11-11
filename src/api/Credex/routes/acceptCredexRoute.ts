import express from "express";
import { AcceptCredexController } from "../controllers/acceptCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { acceptCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function acceptCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/credex/acceptCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Accept a Credex transaction
   *     description: Accepts a pending Credex transaction, finalizing the agreement between parties
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
   *               - signerID
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the Credex to accept
   *               signerID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member accepting the Credex
   *     responses:
   *       200:
   *         description: Credex accepted successfully
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
   *                     credexID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the accepted Credex
   *                     status:
   *                       type: string
   *                       enum: [ACCEPTED]
   *                     acceptedAt:
   *                       type: string
   *                       format: date-time
   *                     acceptedBy:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the member who accepted
   *                 message:
   *                   type: string
   *                   example: Credex accepted successfully
   *       400:
   *         description: Invalid input data or Credex not in acceptable state
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to accept this Credex
   *       404:
   *         description: Credex not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/acceptCredex`,
    validateRequest(acceptCredexSchema),
    authenticatedHandler(AcceptCredexController)
  );
  logger.debug("Route registered: POST /acceptCredex");

  return router;
}
