import { ServiceResult } from '../../../../types/apiResponse';
import { generateResetToken } from '../../controllers/passwordResetController';
import { ledgerSpaceDriver } from '../../../../../config/neo4j';
import { 
  IVerificationProvider, 
  VerificationError, 
  VerificationConfig,
  VerificationServiceConfig 
} from './types';
import { authConfig } from '../../../../config/auth';
import { MemberRepository } from '../../repositories/MemberRepository';
import { WhatsAppProvider } from './whatsappProvider';
import { OTPManager } from './otpManager';
import logger from '../../../../utils/logger';

const RESET_TOKEN_EXPIRY = 10 * 60; // 10 minutes in seconds

interface OTPResponseData {
  deliveryId?: string;
  expiresIn?: number;
}

interface OTPResponse extends ServiceResult<OTPResponseData> {}

export class VerificationService {
  private readonly provider: IVerificationProvider;
  private readonly otpManager: OTPManager;
  private readonly config: VerificationConfig;
  private readonly memberRepository: MemberRepository;

  constructor(config: VerificationServiceConfig) {
    this.provider = config.provider;
    this.otpManager = config.otpManager;
    this.config = config.config;
    this.memberRepository = new MemberRepository();
    
    logger.info('Verification service initialized', {
      providerType: this.provider.getProviderType(),
      config: this.config
    });
  }

  /**
   * Create a new VerificationService with default configuration
   */
  static createDefault(): VerificationService {
    const provider = new WhatsAppProvider();
    const otpManager = new OTPManager();
    const config = {
      otpExpiry: authConfig.otp.expiry,
      maxDailyRequests: authConfig.otp.maxDailyRequests,
      cooldownMinutes: authConfig.otp.cooldownMinutes,
      maxAttempts: authConfig.otp.maxAttempts
    };

    return new VerificationService({ provider, otpManager, config });
  }

  /**
   * Find member by phone number
   * @param phone The phone number to search for
   * @returns ServiceResult with member ID if found
   */
  async findMemberByPhone(phone: string): Promise<ServiceResult> {
    try {
      const member = await this.memberRepository.findByPhone(phone);
      
      if (!member) {
        return {
          success: false,
          message: 'Member not found',
          error: {
            code: 'NOT_FOUND',
            details: 'No member found with this phone number'
          }
        };
      }

      return {
        success: true,
        message: 'Member found',
        data: { memberID: member.id }
      };
    } catch (error) {
      logger.error('Failed to find member by phone', { error, phone });
      return {
        success: false,
        message: 'Failed to find member',
        error: {
          code: 'INTERNAL_ERROR',
          details: 'Database error occurred'
        }
      };
    }
  }

  /**
   * Check if a member exists in the database
   * @param memberID The member's ID
   * @returns ServiceResult indicating if member exists
   */
  async checkMemberExists(memberID: string): Promise<ServiceResult> {
    try {
      const member = await this.memberRepository.findById(memberID);
      
      if (!member) {
        return {
          success: false,
          message: 'Member not found',
          error: {
            code: 'NOT_FOUND',
            details: 'Member does not exist'
          }
        };
      }

      return {
        success: true,
        message: 'Member exists',
        data: { memberExists: true }
      };
    } catch (error) {
      logger.error('Failed to check member exists', { error, memberID });
      return {
        success: false,
        message: 'Failed to check member exists',
        error: {
          code: 'INTERNAL_ERROR',
          details: 'Database error occurred'
        }
      };
    }
  }

  /**
   * Send OTP to a member's contact
   * @param memberID The member's ID
   * @param phone The phone number to send to
   * @returns ServiceResult with the operation status
   */
  async sendOTP(memberID: string, phone: string, purpose?: 'PASSWORD_RESET'): Promise<ServiceResult> {
    const session = ledgerSpaceDriver.session();
    try {
      // Check if member exists and purpose is valid
      const memberCheck = await this.checkMemberExists(memberID);
      if (!memberCheck.success) {
        return memberCheck;
      }

      // Validate purpose
      if (purpose && purpose !== 'PASSWORD_RESET') {
        return {
          success: false,
          message: 'Invalid purpose',
          error: {
            code: VerificationError.INVALID_OTP,
            details: 'Purpose must be PASSWORD_RESET'
          }
        };
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimits(memberID);
      if (!rateLimitCheck.success) {
        return rateLimitCheck;
      }

      // Generate and hash OTP
      const otp = this.otpManager.generateOTP();
      logger.info('Generated OTP', { memberID, otp });
      
      const hashedOTP = await this.otpManager.hashOTP(otp);
      logger.info('Hashed OTP', { memberID, hashedOTPLength: hashedOTP.length });

      // Send OTP via provider
      logger.info('About to send OTP via provider', {
        memberID,
        providerType: this.provider.getProviderType()
      });
      
      const sendResult = await this.provider.sendOTP(phone, otp) as OTPResponse;
      logger.info('OTP send result', {
        memberID,
        success: sendResult.success,
        message: sendResult.message,
        deliveryId: sendResult.data?.deliveryId,
        providerType: this.provider.getProviderType()
      });
      
      if (!sendResult.success) {
        return sendResult;
      }

      // Store OTP details in database
      const query = `
        MATCH (m:Member {memberID: $memberID})
        SET m.hashedOTP = $hashedOTP,
            m.otpExpiry = $expiry,
            m.otpAttempts = 0,
            m.lastOtpRequest = $now,
            m.otpRequestsToday = COALESCE(m.otpRequestsToday, 0) + 1
        WITH m
        RETURN properties(m) as member
      `;

      const result = await session.run(query, {
        memberID,
        hashedOTP,
        expiry: new Date(Date.now() + this.config.otpExpiry * 1000).toISOString(),
        now: new Date().toISOString()
      });

      // Verify OTP was stored
      const record = result.records[0];
      const memberData = record.get('member');
      logger.info('Stored OTP verification', {
        memberID,
        hashedOTPStored: !!memberData.hashedOTP
      });

      return {
        success: true,
        message: 'OTP sent successfully',
        data: {
          deliveryId: sendResult.data?.deliveryId,
          expiresIn: this.config.otpExpiry
        }
      };
    } catch (error) {
      logger.error('Failed to send OTP', { error, memberID });
      return {
        success: false,
        message: 'Failed to send OTP',
        error: {
          code: VerificationError.PROVIDER_ERROR,
          details: 'Internal error occurred'
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Verify an OTP for a member
   * @param memberID The member's ID
   * @param otp The OTP to verify
   * @param purpose The purpose of the OTP (e.g., PASSWORD_RESET)
   * @param source The source of the verification request (e.g., 'app' or 'chatbot')
   * @returns ServiceResult indicating verification status
   */
  async verifyOTP(memberID: string, otp: string, purpose?: 'PASSWORD_RESET', source?: string): Promise<ServiceResult> {
    const session = ledgerSpaceDriver.session();
    try {
      // Validate purpose
      if (purpose && purpose !== 'PASSWORD_RESET') {
        return {
          success: false,
          message: 'Invalid purpose',
          error: {
            code: VerificationError.INVALID_OTP,
            details: 'Purpose must be PASSWORD_RESET'
          }
        };
      }

      // Validate OTP format
      const formatCheck = this.otpManager.validateOTPFormat(otp);
      if (!formatCheck.success) {
        return formatCheck;
      }

      // Get stored OTP details
      const result = await session.run(
        `MATCH (m:Member {memberID: $memberID})
         RETURN m.hashedOTP as hashedOTP,
                m.otpExpiry as expiry,
                m.otpAttempts as attempts,
                m.otpVerified as otpVerified`,
        { memberID }
      );

      logger.info('Retrieved OTP details', {
        memberID,
        hasHashedOTP: !!result.records[0]?.get('hashedOTP'),
        expiry: result.records[0]?.get('expiry'),
        attempts: result.records[0]?.get('attempts'),
        otpVerified: result.records[0]?.get('otpVerified')
      });

      if (result.records.length === 0) {
        return {
          success: false,
          message: 'Member not found',
          error: {
            code: 'NOT_FOUND',
            details: 'Member does not exist'
          }
        };
      }

      const record = result.records[0];
      const hashedOTP = record.get('hashedOTP');
      const expiry = new Date(record.get('expiry'));
      const attempts = record.get('attempts') || 0;

      // Check if OTP exists
      if (!hashedOTP) {
        return {
          success: false,
          message: 'No OTP request found',
          error: {
            code: VerificationError.INVALID_OTP,
            details: 'Please request a new OTP'
          }
        };
      }

      // Check expiry
      if (expiry < new Date()) {
        return {
          success: false,
          message: 'OTP has expired',
          error: {
            code: VerificationError.OTP_EXPIRED,
            details: 'Please request a new OTP'
          }
        };
      }

      // Check attempts
      if (attempts >= this.config.maxAttempts) {
        return {
          success: false,
          message: 'Maximum verification attempts exceeded',
          error: {
            code: VerificationError.MAX_ATTEMPTS_EXCEEDED,
            details: 'Please request a new OTP'
          }
        };
      }

      // Verify OTP
      const verifyResult = await this.otpManager.verifyOTP(otp, hashedOTP);
      logger.info('OTP verification result', {
        memberID,
        success: verifyResult.success,
        message: verifyResult.message
      });
      
      // Update attempts
      await session.run(
        `MATCH (m:Member {memberID: $memberID})
         SET m.otpAttempts = m.otpAttempts + 1
         ${verifyResult.success ? ', m.otpVerified = true, m.hashedOTP = null' : ''}`,
        { memberID }
      );

      if (verifyResult.success && purpose === 'PASSWORD_RESET') {
        try {
          const resetToken = await generateResetToken(memberID);
          return {
            success: true,
            message: 'OTP verified successfully',
            data: {
              resetToken,
              expiresIn: RESET_TOKEN_EXPIRY,
              purpose: 'PASSWORD_RESET' as const
            }
          };
        } catch (error) {
          logger.error('Failed to generate reset token', { error, memberID });
          return {
            success: false,
            message: 'Failed to generate reset token',
            error: {
              code: VerificationError.PROVIDER_ERROR,
              details: 'Internal error occurred'
            }
          };
        }
      }

      return verifyResult;
    } catch (error) {
      logger.error('Failed to verify OTP', { error, memberID });
      return {
        success: false,
        message: 'Failed to verify OTP',
        error: {
          code: VerificationError.PROVIDER_ERROR,
          details: 'Internal error occurred'
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Check rate limits for OTP requests
   * @param memberID The member's ID
   * @returns ServiceResult indicating if rate limits are satisfied
   */
  async checkRateLimits(memberID: string): Promise<ServiceResult> {
    const session = ledgerSpaceDriver.session();
    try {
      const result = await session.run(
        `MATCH (m:Member {memberID: $memberID})
         RETURN m.otpRequestsToday as requests,
                m.lastOtpRequest as lastRequest`,
        { memberID }
      );

      if (result.records.length === 0) {
        return {
          success: false,
          message: 'Member not found',
          error: {
            code: 'NOT_FOUND',
            details: 'Member does not exist'
          }
        };
      }

      const record = result.records[0];
      const requests = record.get('requests') || 0;
      const lastRequest = record.get('lastRequest');

      // Check daily limit
      if (requests >= this.config.maxDailyRequests) {
        return {
          success: false,
          message: 'Daily OTP request limit exceeded',
          error: {
            code: VerificationError.RATE_LIMITED,
            details: 'Please try again tomorrow'
          }
        };
      }

      // Check cooldown
      if (lastRequest) {
        const cooldownEnd = new Date(lastRequest);
        cooldownEnd.setMinutes(cooldownEnd.getMinutes() + this.config.cooldownMinutes);

        if (cooldownEnd > new Date()) {
          const remainingMinutes = Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000);
          return {
            success: false,
            message: 'Please wait before requesting another OTP',
            error: {
              code: VerificationError.RATE_LIMITED,
              details: `Try again in ${remainingMinutes} minutes`
            }
          };
        }
      }

      return {
        success: true,
        message: 'Rate limits satisfied'
      };
    } catch (error) {
      logger.error('Failed to check rate limits', { error, memberID });
      return {
        success: false,
        message: 'Failed to check rate limits',
        error: {
          code: 'INTERNAL_ERROR',
          details: 'Database error occurred'
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Store a pre-generated OTP for a member
   * @param memberID The member's ID
   * @param phone The phone number to associate with the OTP
   * @param hashedOTP The pre-hashed OTP to store
   * @param purpose The purpose of the OTP (e.g., PASSWORD_RESET)
   * @returns ServiceResult with the operation status
   */
  async storeOTP(memberID: string, phone: string, hashedOTP: string, purpose?: 'PASSWORD_RESET'): Promise<ServiceResult> {
    const session = ledgerSpaceDriver.session();
    try {
      // Check if member exists and purpose is valid
      const memberCheck = await this.checkMemberExists(memberID);
      if (!memberCheck.success) {
        return memberCheck;
      }

      // Validate purpose
      if (purpose && purpose !== 'PASSWORD_RESET') {
        return {
          success: false,
          message: 'Invalid purpose',
          error: {
            code: VerificationError.INVALID_OTP,
            details: 'Purpose must be PASSWORD_RESET'
          }
        };
      }

      // Store OTP details in database
      const query = `
        MATCH (m:Member {memberID: $memberID})
        SET m.hashedOTP = $hashedOTP,
            m.otpExpiry = $expiry,
            m.otpAttempts = 0,
            m.lastOtpRequest = $now,
            m.otpRequestsToday = COALESCE(m.otpRequestsToday, 0) + 1
        WITH m
        RETURN properties(m) as member
      `;

      const result = await session.run(query, {
        memberID,
        hashedOTP,
        expiry: new Date(Date.now() + this.config.otpExpiry * 1000).toISOString(),
        now: new Date().toISOString()
      });

      // Verify OTP was stored
      const record = result.records[0];
      const memberData = record.get('member');
      logger.info('Stored OTP verification', {
        memberID,
        hashedOTPStored: !!memberData.hashedOTP
      });

      return {
        success: true,
        message: 'OTP stored successfully',
        data: {
          expiresIn: this.config.otpExpiry
        }
      };
    } catch (error) {
      logger.error('Failed to store OTP', { error, memberID });
      return {
        success: false,
        message: 'Failed to store OTP',
        error: {
          code: VerificationError.PROVIDER_ERROR,
          details: 'Internal error occurred'
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Check if an OTP has been verified for a member
   * @param memberID The member's ID
   * @param phone The phone number to check
   * @returns ServiceResult indicating if OTP has been verified
   */
  async checkOTPVerificationStatus(memberID: string, phone: string): Promise<ServiceResult<{verified: boolean, verifiedAt: string}>> {
    const session = ledgerSpaceDriver.session();
    try {
      // Get verification status
      const result = await session.run(
        `MATCH (m:Member {memberID: $memberID})
         RETURN m.otpVerified as otpVerified,
                m.lastOtpVerification as verifiedAt`,
        { memberID }
      );

      if (result.records.length === 0) {
        return {
          success: false,
          message: 'Member not found',
          error: {
            code: 'NOT_FOUND',
            details: 'Member does not exist'
          }
        };
      }

      const record = result.records[0];
      const otpVerified = record.get('otpVerified');
      const verifiedAt = record.get('verifiedAt');

      logger.info('OTP verification status check', {
        memberID,
        phone,
        otpVerified,
        verifiedAt
      });

      if (otpVerified === true) {
        return {
          success: true,
          message: 'OTP has been verified',
          data: {
            verified: true,
            verifiedAt: verifiedAt || new Date().toISOString()
          }
        };
      }

      return {
        success: false,
        message: 'OTP has not been verified',
        error: {
          code: VerificationError.INVALID_OTP,
          details: 'OTP verification is pending'
        }
      };
    } catch (error) {
      logger.error('Failed to check OTP verification status', { error, memberID });
      return {
        success: false,
        message: 'Failed to check OTP verification status',
        error: {
          code: 'INTERNAL_ERROR',
          details: 'Database error occurred'
        }
      };
    } finally {
      await session.close();
    }
  }
}
