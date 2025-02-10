import { ServiceResult } from '../types/apiResponse';
import { IVerificationProvider, VerificationProviderType } from '../api/Member/services/verification/types';

export class MockWhatsAppProvider implements IVerificationProvider {
  private lastOTP: string | null = null;

  getLastOTP(): string | null {
    console.log('Mock provider getLastOTP called, returning:', this.lastOTP);
    return this.lastOTP;
  }

  resetState(): void {
    console.log('Resetting mock provider state');
    this.lastOTP = null;
  }

  async sendOTP(to: string, otp: string): Promise<ServiceResult> {
    // Store OTP for test verification
    this.lastOTP = otp;
    console.log('Mock provider storing OTP:', { otp, lastOTP: this.lastOTP });
    
    // Always succeed in test environment
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
}
