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
   *               - memberIDtoBeUnauthorized
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to remove authorization from
   *               memberIDtoBeUnauthorized:
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
   *                 message:
   *                   type: string
   *                   example: Authorization removed successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The account ID
   *                         type:
   *                           type: string
   *                           enum: [ACCOUNT_UNAUTHORIZED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who performed the action
   *                         details:
   *                           type: object
   *                           properties:
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                             memberIdUnauthorized:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the unauthorized member
   *                     dashboard:
   *                       type: object
   *                       description: Current state of the account dashboard
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invalid member ID format
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INVALID_PARAMS
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Authentication required
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_UNAUTHORIZED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           example: system
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: NO_AUTH
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       403:
   *         description: Not authorized to modify account
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Not authorized to remove authorization
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
   *                           enum: [ERROR_UNAUTHORIZED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: UNAUTHORIZED
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       404:
   *         description: Account not found or member not authorized
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account not found
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_NOT_FOUND]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: NOT_FOUND
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error while removing authorization
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_INTERNAL]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INTERNAL_ERROR
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
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
