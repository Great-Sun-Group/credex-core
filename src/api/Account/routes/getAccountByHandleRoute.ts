import express from "express";
import { GetAccountByHandleController } from "../controllers/getAccountByHandle";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getAccountByHandleSchema } from "../accountValidationSchemas";
import logger from "../../../utils/logger";

export default function getAccountByHandleRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/account/getAccountByHandle:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account by handle
   *     description: Retrieves account information using its unique handle
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountHandle
   *             properties:
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *                 description: Unique handle for the account (lowercase letters, numbers, underscores)
   *     responses:
   *       200:
   *         description: Account found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 accountData:
   *                   type: object
   *                   properties:
   *                     accountID:
   *                       type: string
   *                       format: uuid
   *                       description: Unique identifier for the account
   *                     accountName:
   *                       type: string
   *                       description: Name of the account
   *       400:
   *         description: Invalid account handle format
   *       404:
   *         description: Account not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/getAccountByHandle`,
    validateRequest(getAccountByHandleSchema),
    GetAccountByHandleController,
    errorHandler
  );
  logger.debug("Route registered: POST /getAccountByHandle");

  return router;
}
