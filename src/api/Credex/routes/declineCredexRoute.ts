import express from "express";
import { DeclineCredexController } from "../controllers/declineCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { declineCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function declineCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/credex/declineCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Decline a Credex transaction
   *     description: Declines a pending Credex transaction, rejecting the proposed agreement
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
   *                 description: ID of the Credex to decline
   *               signerID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member declining the Credex
   *     responses:
   *       200:
   *         description: Credex declined successfully
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
   *                       description: ID of the declined Credex
   *                     status:
   *                       type: string
   *                       enum: [DECLINED]
   *                     declinedAt:
   *                       type: string
   *                       format: date-time
   *                     declinedBy:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the member who declined
   *                 message:
   *                   type: string
   *                   example: Credex declined successfully
   *       400:
   *         description: Invalid input data or Credex not in declinable state
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to decline this Credex
   *       404:
   *         description: Credex not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/declineCredex`,
    validateRequest(declineCredexSchema),
    authenticatedHandler(DeclineCredexController)
  );
  logger.debug("Route registered: POST /declineCredex");

  return router;
}
