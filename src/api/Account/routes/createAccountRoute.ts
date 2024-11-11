import express from "express";
import { CreateAccountController } from "../controllers/createAccount";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { createAccountSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function createAccountRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/account/createAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Create a new account
   *     description: Creates a new account for a member with optional DCO participation settings
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountType
   *               - accountName
   *               - accountHandle
   *               - defaultDenom
   *             properties:
   *               accountType:
   *                 type: string
   *                 enum: [PERSONAL, BUSINESS, CREDEX_FOUNDATION, TRUST, OPERATIONS]
   *                 description: Type of account to create
   *               accountName:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *                 description: Name of the account
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *                 description: Unique handle for the account (lowercase letters, numbers, underscores)
   *               defaultDenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Default denomination for transactions
   *               DCOgiveInCXX:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *                 description: Optional DCO give rate in CXX
   *               DCOdenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Optional DCO denomination
   *     responses:
   *       201:
   *         description: Account created successfully
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
   *                       description: ID of the created account
   *                     accountProperties:
   *                       type: object
   *                       properties:
   *                         accountID:
   *                           type: string
   *                           format: uuid
   *                         accountType:
   *                           type: string
   *                           enum: [PERSONAL, BUSINESS, CREDEX_FOUNDATION, TRUST, OPERATIONS]
   *                         accountName:
   *                           type: string
   *                         accountHandle:
   *                           type: string
   *                         defaultDenom:
   *                           type: string
   *                           enum: [CXX, CAD, USD, XAU, ZWG]
   *                         DCOgiveInCXX:
   *                           type: number
   *                           nullable: true
   *                         DCOdenom:
   *                           type: string
   *                           enum: [CXX, CAD, USD, XAU, ZWG]
   *                           nullable: true
   *                         createdAt:
   *                           type: string
   *                           format: date-time
   *                         updatedAt:
   *                           type: string
   *                           format: date-time
   *                 message:
   *                   type: string
   *                   example: Account created successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Account creation not permitted on current membership tier
   *       404:
   *         description: Member not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/createAccount`,
    validateRequest(createAccountSchema),
    authenticatedHandler(CreateAccountController),
    errorHandler
  );
  logger.debug("Route registered: POST /createAccount");

  return router;
}
