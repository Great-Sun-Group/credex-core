import express from "express";
import { UnauthorizeForAccountController } from "../controllers/unauthorizeForAccount";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { unauthorizeForAccountSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function unauthorizeForAccountRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /unauthorizeForAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Remove member authorization
   *     description: Removes a member's authorization to transact on behalf of an account
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
   *               - memberID
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to remove authorization from
   *               memberID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member to unauthorize
   *     responses:
   *       200:
   *         description: Authorization removed successfully
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
   *                     accountID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the account
   *                     memberIdUnauthorized:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the unauthorized member
   *                 message:
   *                   type: string
   *                   example: Authorization removed successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to modify account
   *       404:
   *         description: Account not found or member not authorized
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/unauthorizeForAccount`,
    validateRequest(unauthorizeForAccountSchema),
    authenticatedHandler(UnauthorizeForAccountController),
    errorHandler
  );
  logger.debug("Route registered: POST /unauthorizeForAccount");

  return router;
}
