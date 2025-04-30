import { Request, Response } from 'express';
import { ApiActionType, MemberActionDetails, ServiceResult } from '../../../types/apiResponse';
import { VerificationService } from '../services/verification/verificationService';
import { VerificationProviderFactory } from '../services/verification/providerFactory';
import { VerificationProviderType, VerificationSource } from '../services/verification/types';
import { OTPManager } from '../services/verification/otpManager';
import { authConfig } from '../../../config/auth';
import logger from '../../../utils/logger';

// Create default service configuration from auth config
const defaultConfig = {
  otpExpiry: authConfig.otp.expiry,
  maxDailyRequests: authConfig.otp.maxDailyRequests,
  cooldownMinutes: authConfig.otp.cooldownMinutes,
  maxAttempts: authConfig.otp.maxAttempts
};

// Create verification service for each request
const createVerificationService = () => {
  return new VerificationService({
    provider: VerificationProviderFactory.createProvider(VerificationProviderType.WHATSAPP),
    otpManager: new OTPManager(),
    config: defaultConfig
  });
};

/**
 * Store an app-generated OTP for later verification
 * This endpoint is used by the app to store an OTP that was generated locally
 * and will be sent to the chatbot via WhatsApp deep link
 */
export const storeOTP = async (req: Request, res: Response) => {
  const verificationService = createVerificationService();
  const { memberID, phone, otp, purpose } = req.body;
  logger.info('Processing OTP storage request', { memberID, phone, purpose });

  try {
    // Validate OTP format
    const otpManager = new OTPManager();
    const formatCheck = otpManager.validateOTPFormat(otp);
    if (!formatCheck.success) {
      return res.status(400).json({
        message: formatCheck.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: formatCheck.error?.code,
              reason: formatCheck.error?.details
            }
          }
        }
      });
    }

    // Verify member exists
    const memberCheck = await verificationService.checkMemberExists(memberID);
    if (!memberCheck.success) {
      return res.status(400).json({
        message: memberCheck.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: memberCheck.error?.code,
              reason: memberCheck.error?.details
            }
          }
        }
      });
    }

    // Check rate limiting
    const rateLimitCheck = await verificationService.checkRateLimits(memberID);
    if (!rateLimitCheck.success) {
      return res.status(429).json({
        message: rateLimitCheck.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: rateLimitCheck.error?.code,
              reason: rateLimitCheck.error?.details
            }
          }
        }
      });
    }

    // Store OTP in database (hash it first)
    const hashedOTP = await otpManager.hashOTP(otp);
    const storeResult = await verificationService.storeOTP(memberID, phone, hashedOTP, purpose);
    
    if (!storeResult.success) {
      return res.status(400).json({
        message: storeResult.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: storeResult.error?.code,
              reason: storeResult.error?.details
            }
          }
        }
      });
    }

    // Return success response with verification token
    const responseDetails: MemberActionDetails = {
      memberID,
      phone,
      expiresIn: defaultConfig.otpExpiry
    };
    
    // Add verification token if available
    if (storeResult.data && typeof storeResult.data === 'object' && 'verificationToken' in storeResult.data) {
      responseDetails.verificationToken = storeResult.data.verificationToken as string;
    }
      
    res.json({
      message: 'OTP stored successfully',
      data: {
        action: {
          id: memberID,
          type: ApiActionType.MEMBER_UPDATE,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: responseDetails
        }
      }
    });
  } catch (error) {
    logger.error('Failed to store OTP', { error, memberID });
    res.status(500).json({
      message: 'Internal server error',
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            code: 'INTERNAL_ERROR',
            reason: 'Failed to process OTP storage request'
          }
        }
      }
    });
  }
};

/**
 * Validate an OTP received from the chatbot
 * This endpoint is used by the chatbot to validate an OTP that was sent by the user
 */
export const validateChatbotOTP = async (req: Request, res: Response) => {
  const verificationService = createVerificationService();
  const { otp, phone, source } = req.body as { otp: string; phone: string; source: VerificationSource };
  logger.info('Processing chatbot OTP validation', { phone, source });

  try {
    // Find member by phone
    const memberResult = await verificationService.findMemberByPhone(phone);
    if (!memberResult.success || !memberResult.data) {
      return res.status(404).json({
        message: memberResult.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            details: {
              code: memberResult.error?.code,
              reason: memberResult.error?.details
            }
          }
        }
      });
    }

    // Type assertion to ensure TypeScript knows the structure of data
    const memberData = memberResult.data as { memberID: string };
    const memberID = memberData.memberID;

    // Verify OTP
    const result = await verificationService.verifyOTP(memberID, otp, undefined, source);
    if (!result.success) {
      return res.status(400).json({
        message: result.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: result.error?.code,
              reason: result.error?.details
            }
          }
        }
      });
    }

    // Return success response
    res.json({
      message: result.message,
      data: {
        action: {
          id: memberID,
          type: ApiActionType.MEMBER_UPDATE,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID,
            otpVerified: true,
            source
          } as MemberActionDetails
        }
      }
    });
  } catch (error) {
    logger.error('Failed to validate chatbot OTP', { error, phone });
    res.status(500).json({
      message: 'Internal server error',
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          details: {
            code: 'INTERNAL_ERROR',
            reason: 'Failed to process OTP validation request'
          }
        }
      }
    });
  }
};
