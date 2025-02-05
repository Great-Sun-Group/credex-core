import express from "express";
import { UpdatePasswordController } from "../controllers/updatePassword";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { authenticate } from "../../../../config/authenticate";
import { validatePassword } from "../../../utils/validators";
import logger from "../../../utils/logger";

const updatePasswordSchema = {
  currentPassword: {
    sanitizer: (value: string) => value,
    validator: (value: string) => ({
      isValid: value.length > 0,
      message: "Current password is required"
    }),
    required: true
  },
  newPassword: {
    sanitizer: (value: string) => value,
    validator: validatePassword,
    required: true
  }
};

export default function updatePasswordRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /updatePassword:
   *   post:
   *     tags: [Members]
   *     summary: Update member password
   *     description: |
   *       Updates a member's password after validating their current password.
   *       Requires authentication and ensures new password meets complexity requirements.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *                 description: Member's current password
   *               newPassword:
   *                 type: string
   *                 description: |
   *                   New password that meets the following requirements:
   *                   - At least 10 characters long
   *                   - Contains at least one uppercase letter
   *                   - Contains at least one lowercase letter
   *                   - Contains at least one number
   *                   - Contains at least one special character
   *     responses:
   *       200:
   *         description: Password updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Password updated successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: Member ID
   *                         type:
   *                           type: string
   *                           enum: [MEMBER_PASSWORD_UPDATED]
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
   *                             timestamp:
   *                               type: string
   *                               format: date-time
   *                     dashboard:
   *                       type: object
   *       400:
   *         description: Invalid password format or missing required fields
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               enum: [INVALID_NEW_PASSWORD, MISSING_PARAMS]
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       401:
   *         description: Current password is incorrect or authentication token is invalid
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               enum: [INVALID_CURRENT_PASSWORD]
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         type:
   *                           type: string
   *                           enum: [ERROR_INTERNAL]
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               enum: [INTERNAL_ERROR]
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   */
  router.post(
    `/updatePassword`,
    authenticate as express.RequestHandler,
    validateRequest(updatePasswordSchema),
    UpdatePasswordController as express.RequestHandler,
    errorHandler
  );
  logger.debug("Route registered: POST /updatePassword");

  return router;
}
