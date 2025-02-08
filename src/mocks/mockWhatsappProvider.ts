import { ServiceResult } from '../types/apiResponse';
import { IVerificationProvider, VerificationProviderType } from '../api/Member/services/verification/types';

export class MockWhatsAppProvider implements IVerificationProvider {
  private static instance: MockWhatsAppProvider | null = null;
  private lastOTP: string | null = null;

  static getInstance(): MockWhatsAppProvider {
    if (!MockWhatsAppProvider.instance) {
      console.log('Creating new mock provider instance');
      MockWhatsAppProvider.instance = new MockWhatsAppProvider();
    } else {
      console.log('Reusing existing mock provider instance');
    }
    return MockWhatsAppProvider.instance;
  }

  private constructor() {
    console.log('Mock provider constructor called');
  }

  getLastOTP(): string | null {
    console.log('Getting last OTP:', {
      lastOTP: this.lastOTP,
      instanceOTP: MockWhatsAppProvider.instance?.lastOTP,
      isSameInstance: this === MockWhatsAppProvider.instance
    });
    return this.lastOTP;
  }

  resetState(): void {
    console.log('Resetting mock provider state');
    this.lastOTP = null;
    MockWhatsAppProvider.instance = null;
  }

  async sendOTP(to: string, otp: string): Promise<ServiceResult> {
    const instance = MockWhatsAppProvider.instance;
    console.log('Mock WhatsApp Provider - sendOTP called:', {
      to,
      otp,
      timestamp: new Date().toISOString(),
      isInstance: this === instance,
      instanceOTP: instance?.lastOTP,
      currentOTP: this.lastOTP
    });

    // Store OTP for test verification
    this.lastOTP = otp;
    if (instance && instance !== this) {
      console.log('Updating instance OTP');
      instance.lastOTP = otp;
    }
    
    console.log('Mock WhatsApp Provider - OTP stored:', {
      storedOTP: this.lastOTP,
      instanceOTP: instance?.lastOTP,
      lastOTPLength: this.lastOTP?.length,
      isSameInstance: this === instance
    });

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
