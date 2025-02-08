import bcrypt from 'bcrypt';
import { ServiceResult } from '../../../../types/apiResponse';
import { VerificationError } from './types';

export class OTPManager {
  private readonly rounds = 10;
  private readonly otpLength = 6;

  /**
   * Generate a random numeric OTP of specified length
   * @returns A string containing the generated OTP
   */
  generateOTP(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString().padStart(this.otpLength, '0');
  }

  /**
   * Hash an OTP using bcrypt
   * @param otp The plain OTP to hash
   * @returns Promise resolving to the hashed OTP
   */
  async hashOTP(otp: string): Promise<string> {
    return bcrypt.hash(otp, this.rounds);
  }

  /**
   * Verify if a plain OTP matches a hashed OTP
   * @param plainOTP The plain OTP to verify
   * @param hashedOTP The hashed OTP to compare against
   * @returns Promise resolving to a ServiceResult indicating success/failure
   */
  async verifyOTP(plainOTP: string, hashedOTP: string): Promise<ServiceResult> {
    try {
      console.log('Verifying OTP:', {
        plainOTPLength: plainOTP.length,
        hashedOTPLength: hashedOTP.length
      });

      const isValid = await bcrypt.compare(plainOTP, hashedOTP);
      console.log('OTP verification result:', { isValid });
      
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid OTP',
          error: {
            code: VerificationError.INVALID_OTP,
            details: 'The provided OTP does not match our records'
          }
        };
      }

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'OTP verification failed',
        error: {
          code: VerificationError.PROVIDER_ERROR,
          details: 'An error occurred while verifying the OTP'
        }
      };
    }
  }

  /**
   * Validate OTP format
   * @param otp The OTP to validate
   * @returns ServiceResult indicating if the OTP format is valid
   */
  validateOTPFormat(otp: string): ServiceResult {
    if (!otp || typeof otp !== 'string') {
      return {
        success: false,
        message: 'Invalid OTP format',
        error: {
          code: VerificationError.INVALID_OTP,
          details: 'OTP must be a string'
        }
      };
    }

    if (otp.length !== this.otpLength) {
      return {
        success: false,
        message: 'Invalid OTP length',
        error: {
          code: VerificationError.INVALID_OTP,
          details: `OTP must be ${this.otpLength} digits long`
        }
      };
    }

    if (!/^\d+$/.test(otp)) {
      return {
        success: false,
        message: 'Invalid OTP format',
        error: {
          code: VerificationError.INVALID_OTP,
          details: 'OTP must contain only numbers'
        }
      };
    }

    return {
      success: true,
      message: 'Valid OTP format'
    };
  }
}
