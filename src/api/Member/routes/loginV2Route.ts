import express from "express";
import { loginMemberV2ExpressHandler } from "../controllers/loginMemberV2";
import { validateRequest } from "../../../middleware/validateRequest";
import { loginMemberV2Schema } from "../memberValidationSchemas";
import { verifyClientApiKey } from "../../../middleware/clientApiKeyAuth";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /v2/login:
 *   post:
 *     tags: [Members]
 *     summary: Login member with password (Mobile App)
 *     description: Authenticate a member using phone number and password. This endpoint is specifically for mobile app authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Member's phone number
 *               password:
 *                 type: string
 *                 description: Member's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully logged in
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
 *                           example: MEMBER_LOGIN
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           format: uuid
 *                         details:
 *                           type: object
 *                           properties:
 *                             memberID:
 *                               type: string
 *                               format: uuid
 *                             phone:
 *                               type: string
 *                             token:
 *                               type: string
 *                             version:
 *                               type: string
 *                               example: v2
 *                             authMethod:
 *                               type: string
 *                               example: password
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication failed
 *       404:
 *         description: Member not found
 *       500:
 *         description: Internal server error
 */
export default function loginV2Route() {
  const router = express.Router();
  logger.info("Initializing login v2 route");

  router.post(
    "/v2/login",
    verifyClientApiKey,
    validateRequest(loginMemberV2Schema),
    loginMemberV2ExpressHandler
  );

  logger.info("Login v2 route initialized successfully");
  return router;
}
