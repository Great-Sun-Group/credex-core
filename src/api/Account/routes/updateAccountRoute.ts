import express from "express";
import { UpdateAccountController } from "../controllers/updateAccount";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { updateAccountSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function updateAccountRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/account/updateAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Update account details
   *     description: Updates account information for fields that are provided
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
   *                 description: ID of the account to update
   *               accountName:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *                 description: New name for the account
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *                 description: New handle for the account (lowercase letters, numbers, underscores)
   *               defaultDenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: New default denomination for transactions
   *               DCOgiveInCXX:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *                 description: New DCO give rate in CXX
   *               DCOdenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: New DCO denomination
   *     responses:
   *       200:
   *         description: Account updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account updated successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     accountID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the updated account
   *       400:
   *         description: Invalid input data or no fields to update
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to update this account
   *       404:
   *         description: Account not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/updateAccount`,
    validateRequest(updateAccountSchema),
    authenticatedHandler(UpdateAccountController),
    errorHandler
  );
  logger.debug("Route registered: POST /updateAccount");

  return router;
}
