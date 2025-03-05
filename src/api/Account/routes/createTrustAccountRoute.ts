import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { createTrustAccountSchema } from "../accountValidationSchemas";
import { createTrustAccountController } from "../controllers/createTrustAccount";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { errorHandler } from "../../../middleware/errorHandler";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /createTrustAccount:
 *   post:
 *     summary: Create a new trust account
 *     description: Creates a new trust account with BANK or VAULT subtype. Only available to tier 5 members.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountName
 *               - accountHandle
 *               - subtype
 *               - denomination
 *             properties:
 *               accountName:
 *                 type: string
 *                 description: Name of the trust account
 *               accountHandle:
 *                 type: string
 *                 description: Unique handle for the account
 *               subtype:
 *                 type: string
 *                 enum: [BANK, VAULT]
 *                 description: Type of trust account
 *               denomination:
 *                 type: string
 *                 description: Account denomination
 *               bankFields:
 *                 type: object
 *                 description: Required for BANK subtype. Contains jurisdiction-specific bank details.
 *                 properties:
 *                   jurisdiction:
 *                     type: string
 *                     description: Country code (e.g., CA, US, ZW)
 *     responses:
 *       201:
 *         description: Trust account created successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - requires authentication
 *       403:
 *         description: Forbidden - requires tier 5 membership
 */

const router = express.Router();

router.post(
  `/createTrustAccount`,
  validateRequest(createTrustAccountSchema),
  authenticatedHandler(createTrustAccountController),
  errorHandler
);
logger.debug("Route registered: POST /createTrustAccount");

export default function createTrustAccountRoute() {
  return router;
}
