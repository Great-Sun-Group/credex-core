import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { editAccountController } from "../controllers/editAccountController";
import { updateAccountSchema } from "../accountValidationSchemas";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/account/{accountID}:
 *   put:
 *     summary: Update an existing exchange account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountID
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the account to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountName:
 *                 type: string
 *                 description: New name for the account
 *               accountHandle:
 *                 type: string
 *                 description: New handle for the account
 *               defaultDenom:
 *                 type: string
 *                 enum: [CXX, USD, CAD, XAU]
 *                 description: Default denomination for the account
 *             example:
 *               accountName: "Fresh Tomatoes"
 *               accountHandle: "freshTomatoes"
 *               defaultDenom: "USD"
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
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         type:
 *                           type: string
 *                           example: ACCOUNT_UPDATED
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           format: uuid
 *                         details:
 *                           type: object
 *                           properties:
 *                             accountID:
 *                               type: string
 *                               format: uuid
 *                             accountName:
 *                               type: string
 *                             accountHandle:
 *                               type: string
 *                             defaultDenom:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         account:
 *                           type: object
 *                           properties:
 *                             accountID:
 *                               type: string
 *                               format: uuid
 *                             accountName:
 *                               type: string
 *                             accountHandle:
 *                               type: string
 *                             defaultDenom:
 *                               type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User not authorized for this account
 *       404:
 *         description: Account not found
 *       409:
 *         description: Account handle already in use
 *       500:
 *         description: Internal server error
 */
export default function editAccountRoute() {
  const router = express.Router();
  logger.debug("Initializing edit account route");

  router.put(
    "/account/:accountID",
    authMiddleware,
    validateRequest(updateAccountSchema),
    editAccountController
  );

  logger.debug("Edit account route initialized");
  return router;
}
