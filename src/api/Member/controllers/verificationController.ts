import { Request, Response } from 'express';
import { ApiActionType, MemberActionDetails, ServiceResult } from '../../../types/apiResponse';
import { VerificationService } from '../services/verification/verificationService';
import { VerificationProviderType, VerificationError } from '../services/verification/types';
import { WhatsAppProvider } from '../services/verification/whatsappProvider';
import { OTPManager } from '../services/verification/otpManager';
import { MockWhatsAppProvider } from '../../../mocks/mockWhatsappProvider';
import logger from '../../../utils/logger';

interface OTPResponseData {
  deliveryId?: string;
  expiresIn?: number;
}

interface OTPResponse extends ServiceResult<OTPResponseData> {}

// Create default service configuration
const defaultConfig = {
  otpExpiry: parseInt(process.env.OTP_EXPIRY || '300', 10),
  maxDailyRequests: parseInt(process.env.MAX_DAILY_OTP_REQUESTS || '5', 10),
  cooldownMinutes: parseInt(process.env.OTP_COOLDOWN_MINUTES || '5', 10),
  maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10)
};

// Create verification service based on environment
const createVerificationService = () => {
  const otpManager = new OTPManager();
  const provider = process.env.NODE_ENV === 'test' 
    ? MockWhatsAppProvider.getInstance()
    : new WhatsAppProvider();

  return new VerificationService({
    provider,
    otpManager,
    config: defaultConfig
  });
};

export const requestOTP = async (req: Request, res: Response) => {
  const { memberID, phone } = req.body;
  logger.info('Creating verification service for request', {
    memberID,
    isTest: process.env.NODE_ENV === 'test'
  });

  const verificationService = createVerificationService();

  try {
    // Check if member uses v2 password auth
    const authCheck = await verificationService.checkV2PasswordAuth(memberID);
    if (!authCheck.success) {
      return res.status(400).json({
        message: authCheck.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: authCheck.error?.code,
              reason: authCheck.error?.details
            }
          }
        }
      });
    }

    // Send OTP
    const result = await verificationService.sendOTP(memberID, phone) as OTPResponse;
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
            phone,
            expiresIn: result.data?.expiresIn
          } as MemberActionDetails
        }
      }
    });
  } catch (error) {
    logger.error('Failed to request OTP', { error, memberID });
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
            reason: 'Failed to process OTP request'
          }
        }
      }
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { memberID, otp } = req.body;
  logger.info('Creating verification service for verify', {
    memberID,
    isTest: process.env.NODE_ENV === 'test'
  });

  const verificationService = createVerificationService();

  try {
    // Verify OTP
    const result = await verificationService.verifyOTP(memberID, otp);
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
            otpVerified: true
          } as MemberActionDetails
        }
      }
    });
  } catch (error) {
    logger.error('Failed to verify OTP', { error, memberID });
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
            reason: 'Failed to verify OTP'
          }
        }
      }
    });
  }
};
