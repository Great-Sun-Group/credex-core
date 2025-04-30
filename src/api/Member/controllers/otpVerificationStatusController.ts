import { Request, Response } from 'express';
import { ApiActionType, MemberActionDetails } from '../../../types/apiResponse';
import { VerificationService } from '../services/verification/verificationService';
import { VerificationProviderFactory } from '../services/verification/providerFactory';
import { VerificationProviderType } from '../services/verification/types';
import { OTPManager } from '../services/verification/otpManager';
import { authConfig } from '../../../config/auth';
import logger from '../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { ledgerSpaceDriver } from '../../../../config/neo4j';

// Create default service configuration from auth config
const defaultConfig = {
  otpExpiry: authConfig.otp.expiry,
  maxDailyRequests: authConfig.otp.maxDailyRequests,
  cooldownMinutes: authConfig.otp.cooldownMinutes,
  maxAttempts: authConfig.otp.maxAttempts
};

// Verification token expiry time (5 minutes)
export const VERIFICATION_TOKEN_EXPIRY = 5 * 60; // 5 minutes in seconds

/**
 * Generates a verification token for a member
 * This token can be used for any operation requiring enhanced authentication
 * 
 * @param memberID The ID of the member to generate a token for
 * @returns The generated verification token
 */
export async function generateVerificationToken(memberID: string): Promise<string> {
  const session = ledgerSpaceDriver.session();
  try {
    const verificationToken = uuidv4();
    const expiry = Math.floor(Date.now() / 1000) + VERIFICATION_TOKEN_EXPIRY;

    await session.run(
      `MATCH (m:Member {memberID: $memberID})
       SET m.verificationToken = $verificationToken,
           m.verificationTokenExpiry = $expiry`,
      { memberID, verificationToken, expiry }
    );

    logger.info('Generated verification token', { memberID });
    return verificationToken;
  } catch (error) {
    logger.error('Failed to generate verification token', { error, memberID });
    throw error;
  } finally {
    await session.close();
  }
}

// Create verification service for each request
const createVerificationService = () => {
  return new VerificationService({
    provider: VerificationProviderFactory.createProvider(VerificationProviderType.WHATSAPP),
    otpManager: new OTPManager(),
    config: defaultConfig
  });
};

/**
 * Check if an OTP has been verified for a given phone number
 * This endpoint is used by the app to check if the OTP has been verified by the chatbot
 */
export const checkOTPVerificationStatus = async (req: Request, res: Response) => {
  const verificationService = createVerificationService();
  const { phone } = req.query as { phone: string };
  logger.info('Checking OTP verification status', { phone });

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

    // Check if OTP has been verified
    const result = await verificationService.checkOTPVerificationStatus(memberID, phone);
    
    // Check if token is active but don't return it in the response
    // This is for logging purposes only
    if (result.success) {
      try {
        // Check if there's an active verification token
        const session = ledgerSpaceDriver.session();
        try {
          const tokenResult = await session.run(
            `MATCH (m:Member {memberID: $memberID})
             WHERE m.verificationTokenActive = true
             AND m.verificationTokenExpiry > $now
             RETURN count(m) as hasActiveToken`,
            { 
              memberID,
              now: Math.floor(Date.now() / 1000)
            }
          );
          
          const hasActiveToken = tokenResult.records[0].get('hasActiveToken') > 0;
          
          logger.info('Verification token status check', { 
            memberID, 
            phone,
            hasActiveToken
          });
        } finally {
          await session.close();
        }
      } catch (error) {
        logger.error('Failed to check verification token status', { error, memberID, phone });
      }
    }
    
    // Return response without the verification token
    res.json({
      message: result.success ? 'OTP verification status retrieved' : 'OTP not verified',
      data: {
        action: {
          id: memberID,
          type: ApiActionType.MEMBER_UPDATE,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID,
            phone,
            verified: result.success,
            verifiedAt: result.success && result.data ? result.data.verifiedAt : null
          } as MemberActionDetails
        }
      }
    });
  } catch (error) {
    logger.error('Failed to check OTP verification status', { error, phone });
    res.status(500).json({
      message: 'Internal server error',
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          details: {
            code: 'INTERNAL_ERROR',
            reason: 'Failed to check OTP verification status'
          }
        }
      }
    });
  }
};
