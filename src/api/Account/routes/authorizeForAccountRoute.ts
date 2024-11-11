import express from "express";
import { AuthorizeForAccountController } from "../controllers/authorizeForAccount";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { authorizeForAccountSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function authorizeForAccountRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /authorizeForAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Authorize member for account
   *     description: Authorizes a member to transact on behalf of an account. Requires Entrepreneur tier or above.
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
   *               - memberHandleToBeAuthorized
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to authorize for
   *               memberHandleToBeAuthorized:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *                 description: Handle of the member to authorize
   *     responses:
   *       200:
   *         description: Authorization successful
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
   *                     memberIdAuthorized:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the authorized member
   *                 message:
   *                   type: string
   *                   example: Account authorized successfully
   *       400:
   *         description: Invalid input data or authorization limit reached
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient membership tier or not authorized to modify account
   *       404:
   *         description: Account or member not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/authorizeForAccount`,
    validateRequest(authorizeForAccountSchema),
    authenticatedHandler(AuthorizeForAccountController),
    errorHandler
  );
  logger.debug("Route registered: POST /authorizeForAccount");

  return router;
}
