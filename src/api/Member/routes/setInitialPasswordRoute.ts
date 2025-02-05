import express from "express";
import { setInitialPasswordExpressHandler } from "../controllers/setInitialPassword";
import { validateRequest } from "../../../middleware/validateRequest";
import { verifyClientApiKey } from "../../../middleware/clientApiKeyAuth";
import { authenticate } from "../../../../config/authenticate";
import logger from "../../../utils/logger";

// Create a schema for setting initial password
const setInitialPasswordSchema = {
  phone: {
    sanitizer: (value: string) => value,
    validator: (value: string) => ({ isValid: true }),
    required: true,
  },
  password: {
    sanitizer: (value: string) => value,
    validator: (value: string) => ({ isValid: true }), // Password validation handled in service
    required: true,
  },
};

/**
 * @swagger
 * /api/member/set-initial-password:
 *   post:
 *     tags: [Members]
 *     summary: Set initial password for WhatsApp to mobile app transition
 *     description: Sets the initial password for a member transitioning from WhatsApp to mobile app. Requires phone-only authentication.
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
 *                 description: New password to set
 *     responses:
 *       200:
 *         description: Password set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password set successfully
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
 *                           example: MEMBER_UPDATE
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
 *         description: Invalid request parameters or password already set
 *       401:
 *         description: Authentication failed
 *       404:
 *         description: Member not found
 *       500:
 *         description: Internal server error
 */
export default function setInitialPasswordRoute() {
  const router = express.Router();
  logger.info("Initializing set initial password route");

  router.post(
    "/member/set-initial-password",
    verifyClientApiKey,
    authenticate, // Require phone-only auth first
    validateRequest(setInitialPasswordSchema),
    setInitialPasswordExpressHandler
  );

  logger.info("Set initial password route initialized successfully");
  return router;
}
