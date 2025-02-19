import express from 'express';
import { authenticate } from '../../../../config/authenticate';
import { requestOTP, verifyOTP } from '../controllers/verificationController';
import { validateRequest } from '../../../middleware/validateRequest';
import { verifyClientApiKey } from '../../../middleware/clientApiKeyAuth';
import { validateUUID, validatePhone } from '../../../utils/validators';
import { sanitizeUUID, sanitizePhone } from '../../../utils/inputSanitizer';
import { VerificationPurpose } from '../services/verification/types';

export default function verificationRoutes() {
  const router = express.Router();

  // Request schemas
const requestOTPSchema = {
  memberID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: false
  },
  phone: {
    sanitizer: sanitizePhone,
    validator: validatePhone,
    required: true
  },
  purpose: {
    sanitizer: (value: string) => value?.toUpperCase() as VerificationPurpose,
    validator: (value: string) => ({
      isValid: value === 'PASSWORD_RESET',
      message: 'Purpose must be PASSWORD_RESET'
    }),
    required: true
  }
};

const verifyOTPSchema = {
  memberID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: false
  },
  phone: {
    sanitizer: sanitizePhone,
    validator: validatePhone,
    required: false // Required only if memberID not provided
  },
  otp: {
    sanitizer: sanitizePhone, // Using phone sanitizer as it removes non-digits
    validator: (otp: string) => ({
      isValid: /^\d{6}$/.test(otp),
      message: otp.length !== 6 ? 'OTP must be 6 digits' : 'Valid OTP'
    }),
    required: true
  },
  purpose: {
    sanitizer: (value: string) => value?.toUpperCase() as VerificationPurpose,
    validator: (value: string) => ({
      isValid: value === 'PASSWORD_RESET',
      message: 'Purpose must be PASSWORD_RESET'
    }),
    required: true
  }
};

/**
 * @swagger
 * /verify/requestOtp:
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
 *               - phone
 *               - purpose
 *             properties:
 *               memberID:
 *                 type: string
 *                 format: uuid
 *                 description: Optional member ID if known
 *               phone:
 *                 type: string
 *                 pattern: ^\+?[1-9]\d{1,14}$
 *                 description: Phone number to receive OTP
 *               purpose:
 *                 type: string
 *                 enum: [PASSWORD_RESET]
 *                 description: Purpose of OTP verification (must be PASSWORD_RESET)
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
router.post('/requestOtp', verifyClientApiKey, validateRequest(requestOTPSchema), (req, res, next) => {
  // Require authentication for non-password-reset purposes
  if (req.body.purpose !== 'PASSWORD_RESET') {
    return authenticate(req, res, () => requestOTP(req, res));
  }
  // Skip authentication for password reset
  return requestOTP(req, res);
});

/**
 * @swagger
 * /verify/verifyOtp:
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
 *               - otp
 *               - purpose
 *             properties:
 *               memberID:
 *                 type: string
 *                 format: uuid
 *                 description: Optional member ID if known
 *               phone:
 *                 type: string
 *                 pattern: ^\+?[1-9]\d{1,14}$
 *                 description: Phone number (required if memberID not provided)
 *               purpose:
 *                 type: string
 *                 enum: [PASSWORD_RESET]
 *                 description: Purpose of OTP verification (must be PASSWORD_RESET)
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
 *                             resetToken:
 *                               type: string
 *                               format: uuid
 *                               description: Token for password reset (only when purpose is PASSWORD_RESET)
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
router.post('/verifyOtp', verifyClientApiKey, validateRequest(verifyOTPSchema), (req, res, next) => {
  // Require authentication for non-password-reset purposes
  if (req.body.purpose !== 'PASSWORD_RESET') {
    return authenticate(req, res, () => verifyOTP(req, res));
  }
  // Skip authentication for password reset
  return verifyOTP(req, res);
});

  return router;
}
