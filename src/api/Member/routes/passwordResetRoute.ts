import { Router } from 'express';
import { resetPassword } from '../controllers/passwordResetController';
import { validateRequest } from '../../../middleware/validateRequest';
import { verifyClientApiKey } from '../../../middleware/clientApiKeyAuth';
import * as sanitizers from '../../../utils/inputSanitizer';

/**
 * @swagger
 * /resetPassword:
 *   post:
 *     tags: [Members]
 *     summary: Reset member password using a reset token
 *     description: |
 *       Resets a member's password using a token obtained through the OTP verification process.
 *       The reset token must be valid and not expired.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *                 format: uuid
 *                 description: Reset token obtained from OTP verification
 *               newPassword:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 128
 *                 description: New password that meets complexity requirements
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid input or expired token
 *       401:
 *         description: Invalid client API key
 *       500:
 *         description: Internal server error
 */

export default function passwordResetRoute() {
  const router = Router();

  // Schema for password reset request
  const resetPasswordSchema = {
    resetToken: {
      sanitizer: sanitizers.sanitizeString,
      validator: (value: string) => ({
        isValid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
        message: 'Invalid reset token format'
      }),
      required: true
    },
    newPassword: {
      sanitizer: sanitizers.sanitizeString,
      validator: (value: string) => {
        if (value.length < 10) return { isValid: false, message: 'Password must be at least 10 characters long' };
        if (value.length > 128) return { isValid: false, message: 'Password must not exceed 128 characters' };
        if (!/[A-Z]/.test(value)) return { isValid: false, message: 'Password must contain at least one uppercase letter' };
        if (!/[a-z]/.test(value)) return { isValid: false, message: 'Password must contain at least one lowercase letter' };
        if (!/[0-9]/.test(value)) return { isValid: false, message: 'Password must contain at least one number' };
        if (!/[^A-Za-z0-9]/.test(value)) return { isValid: false, message: 'Password must contain at least one special character' };
        return { isValid: true };
      },
      required: true
    }
  };

  // POST /resetPassword - Reset member password using reset token
  router.post(
    '/resetPassword',
    verifyClientApiKey,
    validateRequest(resetPasswordSchema),
    resetPassword
  );

  return router;
}
