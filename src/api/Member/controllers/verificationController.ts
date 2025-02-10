import { Request, Response } from 'express';
import { ApiActionType, MemberActionDetails, ServiceResult } from '../../../types/apiResponse';
import { generateResetToken } from './passwordResetController';

interface MemberLookupData {
  memberID: string;
}
import { VerificationService } from '../services/verification/verificationService';
import { VerificationProviderType, VerificationError } from '../services/verification/types';
import { WhatsAppProvider } from '../services/verification/whatsappProvider';
import { OTPManager } from '../services/verification/otpManager';
import { MockWhatsAppProvider } from '../../../mocks/mockWhatsappProvider';
import { VerificationProviderFactory } from '../services/verification/providerFactory';
import logger from '../../../utils/logger';

interface OTPResponseData {
  deliveryId?: string;
  expiresIn?: number;
  resetToken?: string;
}

interface OTPResponse extends ServiceResult<OTPResponseData> {}

// Create default service configuration
const defaultConfig = {
  otpExpiry: parseInt(process.env.OTP_EXPIRY || '300', 10),
  maxDailyRequests: parseInt(process.env.MAX_DAILY_OTP_REQUESTS || '5', 10),
  cooldownMinutes: parseInt(process.env.OTP_COOLDOWN_MINUTES || '5', 10),
  maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10)
};

// Create verification service for each request
const createVerificationService = () => {
  return new VerificationService({
    provider: VerificationProviderFactory.createProvider(VerificationProviderType.WHATSAPP),
    otpManager: new OTPManager(),
    config: defaultConfig
  });
};

export const requestOTP = async (req: Request, res: Response) => {
  const verificationService = createVerificationService();
  const { memberID, phone, purpose } = req.body;
  logger.info('Processing OTP request', { memberID, phone });

  try {
    // If no memberID provided, look up by phone
    let resolvedMemberID = memberID;
    if (!resolvedMemberID) {
      const memberResult = await verificationService.findMemberByPhone(phone) as ServiceResult<MemberLookupData>;
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
      resolvedMemberID = memberResult.data.memberID;
    } else {
      // If memberID provided, verify it exists
      const memberCheck = await verificationService.checkMemberExists(resolvedMemberID);
      if (!memberCheck.success) {
        return res.status(400).json({
          message: memberCheck.message,
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: resolvedMemberID,
              details: {
                code: memberCheck.error?.code,
                reason: memberCheck.error?.details
              }
            }
          }
        });
      }
    }

    // Send OTP using resolved memberID
    const result = await verificationService.sendOTP(resolvedMemberID, phone, purpose) as OTPResponse;
    if (!result.success) {
      return res.status(400).json({
        message: result.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: resolvedMemberID,
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
            memberID: resolvedMemberID,
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
  const verificationService = createVerificationService();
  const { memberID, phone, otp, purpose } = req.body;
  logger.info('Processing OTP verification', { memberID, phone, purpose });

  try {
    // If no memberID provided, look up by phone
    let resolvedMemberID = memberID;
    if (!resolvedMemberID) {
      const memberResult = await verificationService.findMemberByPhone(phone) as ServiceResult<MemberLookupData>;
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
      resolvedMemberID = memberResult.data.memberID;
    }

    // Verify OTP using resolved memberID
    const result = await verificationService.verifyOTP(resolvedMemberID, otp, purpose) as ServiceResult<{
      resetToken?: string;
      expiresIn?: number;
      purpose?: 'PASSWORD_RESET';
    }>;
    if (!result.success) {
      return res.status(400).json({
        message: result.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: resolvedMemberID,
            details: {
              code: result.error?.code,
              reason: result.error?.details
            }
          }
        }
      });
    }

    // Get reset token and expiry from verification result
    const { resetToken, expiresIn } = result.data || {};

    res.json({
      message: result.message,
      data: {
        action: {
          id: memberID,
          type: ApiActionType.MEMBER_UPDATE,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID: resolvedMemberID,
            otpVerified: true,
            ...(resetToken && { 
              resetToken,
              purpose: 'PASSWORD_RESET',
              expiresIn
            })
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
