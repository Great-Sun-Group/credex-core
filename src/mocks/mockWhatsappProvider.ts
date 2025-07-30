import { ServiceResult } from '../types/apiResponse';
import { IVerificationProvider, VerificationProviderType } from '../api/Member/services/verification/types';
import logger from '../utils/logger';

export class MockWhatsAppProvider implements IVerificationProvider {
  private lastOTP: string | null = null;
  private readonly DEV_OTP = '123456'; // Fixed OTP for development

  getLastOTP(): string | null {
    logger.debug('Mock provider getLastOTP called, returning:', this.lastOTP);
    return this.lastOTP;
  }

  resetState(): void {
    logger.debug('Resetting mock provider state');
    this.lastOTP = null;
  }

  async sendOTP(to: string, otp: string): Promise<ServiceResult> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const useMockVerification = process.env.USE_MOCK_VERIFICATION === 'true';
    
    // In development mode with mock verification, always use the fixed OTP
    if (isDevelopment && useMockVerification) {
      this.lastOTP = this.DEV_OTP;
      logger.info('Mock provider using fixed development OTP', { 
        to, 
        requestedOTP: otp, 
        actualOTP: this.DEV_OTP 
      });
      
      return {
        success: true,
        message: `OTP sent successfully (development mock - use ${this.DEV_OTP})`,
        data: {
          deliveryId: 'mock-dev-delivery-id',
          devOTP: this.DEV_OTP
        }
      };
    }
    
    // For testing or other scenarios, store the provided OTP
    this.lastOTP = otp;
    logger.debug('Mock provider storing OTP:', { otp, lastOTP: this.lastOTP });
    
    return {
      success: true,
      message: 'OTP sent successfully (mock)',
      data: {
        deliveryId: 'mock-delivery-id'
      }
    };
  }

  async validateDelivery(deliveryId: string): Promise<boolean> {
    return true;
  }

  getProviderType(): VerificationProviderType {
    return VerificationProviderType.WHATSAPP;
  }

  /**
   * Get the development OTP for testing purposes
   */
  getDevOTP(): string {
    return this.DEV_OTP;
  }
}
