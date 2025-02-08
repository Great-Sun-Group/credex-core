import express from 'express';
import { requestOTP, verifyOTP } from '../controllers/verificationController';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../../config/authenticate';
import { validateUUID, validatePhone } from '../../../utils/validators';
import { sanitizeUUID, sanitizePhone } from '../../../utils/inputSanitizer';

const router = express.Router();

// Request schemas
const requestOTPSchema = {
  memberID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: true
  },
  phone: {
    sanitizer: sanitizePhone,
    validator: validatePhone,
    required: true
  }
};

const verifyOTPSchema = {
  memberID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: true
  },
  otp: {
    sanitizer: sanitizePhone, // Using phone sanitizer as it removes non-digits
    validator: (otp: string) => ({
      isValid: /^\d{6}$/.test(otp),
      message: otp.length !== 6 ? 'OTP must be 6 digits' : 'Valid OTP'
    }),
    required: true
  }
};

/**
 * @swagger
 * /verify/request-otp:
 *   post:
 *     tags: [Members]
 *     summary: Request OTP verification
 *     description: Sends an OTP for v2 password user verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - phone
 *             properties:
 *               memberID:
 *                 type: string
 *                 format: uuid
 *                 description: Member's unique identifier
 *               phone:
 *                 type: string
 *                 pattern: ^\+?[1-9]\d{1,14}$
 *                 description: Phone number to receive OTP
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
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
 *                           enum: [MEMBER_UPDATE]
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
 *                             expiresIn:
 *                               type: number
 *                               description: OTP expiry in seconds
 *       400:
 *         description: Invalid request or rate limited
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
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                               enum: [RATE_LIMITED, V1_USER_NOT_SUPPORTED, VALIDATION_ERROR]
 *                             reason:
 *                               type: string
 *                             cooldownRemaining:
 *                               type: number
 *                               description: Minutes until next attempt allowed (for rate limiting)
 */
router.post('/request-otp', authenticate, validateRequest(requestOTPSchema), requestOTP);

/**
 * @swagger
 * /verify/verify-otp:
 *   post:
 *     tags: [Members]
 *     summary: Verify OTP
 *     description: Verifies the OTP received by the member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - otp
 *             properties:
 *               memberID:
 *                 type: string
 *                 format: uuid
 *                 description: Member's unique identifier
 *               otp:
 *                 type: string
 *                 pattern: ^\d{6}$
 *                 description: 6-digit OTP received
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
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
 *                           enum: [MEMBER_UPDATE]
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
 *                             otpVerified:
 *                               type: boolean
 *                               example: true
 *       400:
 *         description: Invalid OTP or verification failed
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
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                               enum: [INVALID_OTP, OTP_EXPIRED, MAX_ATTEMPTS_EXCEEDED]
 *                             reason:
 *                               type: string
 *                             remainingAttempts:
 *                               type: number
 *                               description: Number of attempts remaining before lockout
 */
router.post('/verify-otp', authenticate, validateRequest(verifyOTPSchema), verifyOTP);

export default router;
