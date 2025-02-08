import { ServiceResult } from '../../../../types/apiResponse';
import { ledgerSpaceDriver } from '../../../../../config/neo4j';
import { 
  IVerificationProvider, 
  VerificationProviderType, 
  VerificationError, 
  VerificationConfig,
  VerificationServiceConfig 
} from './types';
import { WhatsAppProvider } from './whatsappProvider';
import { OTPManager } from './otpManager';
import logger from '../../../../utils/logger';

interface OTPResponseData {
  deliveryId?: string;
  expiresIn?: number;
}

interface OTPResponse extends ServiceResult<OTPResponseData> {}

export class VerificationService {
  private readonly provider: IVerificationProvider;
  private readonly otpManager: OTPManager;
  private readonly config: VerificationConfig;

  constructor(config: VerificationServiceConfig) {
    this.provider = config.provider;
    this.otpManager = config.otpManager;
    this.config = config.config;
    
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
      otpExpiry: parseInt(process.env.OTP_EXPIRY || '300', 10), // 5 minutes in seconds
      maxDailyRequests: parseInt(process.env.MAX_DAILY_OTP_REQUESTS || '5', 10),
      cooldownMinutes: parseInt(process.env.OTP_COOLDOWN_MINUTES || '5', 10),
      maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10)
    };

    return new VerificationService({ provider, otpManager, config });
  }

  /**
   * Check if a member is using v2 password authentication
   * @param memberID The member's ID
   * @returns ServiceResult indicating if member uses v2 password auth
   */
  async checkV2PasswordAuth(memberID: string): Promise<ServiceResult> {
    const session = ledgerSpaceDriver.session();
    try {
      const result = await session.run(
        `MATCH (m:Member {memberID: $memberID})
         RETURN m.version as version, m.authMethod as authMethod`,
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

      const version = result.records[0].get('version');
      const authMethod = result.records[0].get('authMethod');

      // Check if user is v1 or not using password auth
      if (version === 'v1') {
        return {
          success: false,
          message: 'Non-password users cannot request OTP verification',
          error: {
            code: VerificationError.NON_PASSWORD_USER,
            details: 'Only v2 password users can request OTP verification'
          }
        };
      }

      // Check if user is using password auth
      if (authMethod !== 'password') {
        return {
          success: false,
          message: 'Non-password users cannot request OTP verification',
          error: {
            code: VerificationError.NON_PASSWORD_USER,
            details: 'Only v2 password users can request OTP verification'
          }
        };
      }

      return {
        success: true,
        message: 'Member uses v2 password auth',
        data: { isV2Password: true }
      };
    } catch (error) {
      logger.error('Failed to check member auth version', { error, memberID });
      return {
        success: false,
        message: 'Failed to check member auth version',
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
   * Send OTP to a member's contact
   * @param memberID The member's ID
   * @param phone The phone number to send to
   * @returns ServiceResult with the operation status
   */
  async sendOTP(memberID: string, phone: string): Promise<ServiceResult> {
    const session = ledgerSpaceDriver.session();
    try {
      // Check if user is allowed to use OTP
      const authCheck = await this.checkV2PasswordAuth(memberID);
      if (!authCheck.success) {
        return authCheck;
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
   * @returns ServiceResult indicating verification status
   */
  async verifyOTP(memberID: string, otp: string): Promise<ServiceResult> {
    const session = ledgerSpaceDriver.session();
    try {
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
  private async checkRateLimits(memberID: string): Promise<ServiceResult> {
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
}
