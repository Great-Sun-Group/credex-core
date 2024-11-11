import express from "express";
import { loginMemberExpressHandler } from "../controllers/loginMember";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { loginMemberSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function loginRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /login:
   *   post:
   *     tags: [Members]
   *     summary: Login a member
   *     description: Authenticates a member using their phone number and generates a new token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phone
   *             properties:
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *                 description: International phone number format
   *     responses:
   *       200:
   *         description: Login successful
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
   *                     token:
   *                       type: string
   *                       description: Authentication token
   *                     memberID:
   *                       type: string
   *                       format: uuid
   *                       description: Unique member identifier
   *                 message:
   *                   type: string
   *                   example: Login successful
   *       400:
   *         description: Invalid phone number format
   *       404:
   *         description: Member not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/login`,
    validateRequest(loginMemberSchema),
    loginMemberExpressHandler,
    errorHandler
  );
  logger.debug("Route registered: POST /login");

  return router;
}
