import express from "express";
import { CancelCredexController } from "../controllers/cancelCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { cancelCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function cancelCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /cancelCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Cancel a Credex transaction
   *     description: Cancels a pending Credex transaction. Only the issuer can cancel their own pending Credex. Requires authentication.
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
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the Credex to cancel
   *     responses:
   *       200:
   *         description: Credex cancelled successfully
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
   *                     credexID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the cancelled Credex
   *                 message:
   *                   type: string
   *                   example: Credex cancelled successfully
   *                   description: Status message
   *       400:
   *         description: Invalid input data or Credex not in cancellable state
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to cancel this Credex (must be issuer)
   *       404:
   *         description: Credex not found
   *       409:
   *         description: Credex has already been processed
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/cancelCredex`,
    validateRequest(cancelCredexSchema),
    authenticatedHandler(CancelCredexController)
  );
  logger.debug("Route registered: POST /cancelCredex");

  return router;
}
