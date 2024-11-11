import express from "express";
import { UpdateSendOffersToController } from "../controllers/updateSendOffersTo";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { updateSendOffersToSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function updateSendOffersToRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /updateSendOffersTo:
   *   post:
   *     tags: [Accounts]
   *     summary: Update send offers settings
   *     description: Updates which member should receive offers for an account. The member must be authorized for the account.
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
   *               - memberIDtoSendOffers
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to update send offers settings for
   *               memberIDtoSendOffers:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member who should receive offers
   *     responses:
   *       200:
   *         description: Send offers settings updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Offer recipient updated successfully
   *       400:
   *         description: Invalid input data or member not authorized for account
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to modify account
   *       404:
   *         description: Account or member not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/updateSendOffersTo`,
    validateRequest(updateSendOffersToSchema),
    authenticatedHandler(UpdateSendOffersToController),
    errorHandler
  );
  logger.debug("Route registered: POST /updateSendOffersTo");

  return router;
}
