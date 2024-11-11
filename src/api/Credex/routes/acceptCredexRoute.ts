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
   * /acceptCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Accept a Credex transaction
   *     description: Accepts a pending Credex transaction, finalizing the agreement between parties. Requires authentication.
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
   *                 description: ID of the Credex to accept
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
   *                   description: Whether the operation was successful
   *                 data:
   *                   type: object
   *                   properties:
   *                     acceptCredexData:
   *                       type: object
   *                       description: Details of the accepted Credex
   *                       properties:
   *                         acceptorAccountID:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the accepting account
   *                     dashboardData:
   *                       type: object
   *                       description: Updated dashboard information
   *                       nullable: true
   *                 message:
   *                   type: string
   *                   example: Credex accepted successfully
   *                   description: Status message
   *       400:
   *         description: Invalid input data or Credex not in acceptable state
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to accept this Credex
   *       404:
   *         description: Credex not found
   *       409:
   *         description: Credex has already been accepted
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
