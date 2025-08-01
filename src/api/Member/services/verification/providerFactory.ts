import { IVerificationProvider, VerificationProviderType } from './types';
import { WhatsAppProvider } from './whatsappProvider';
import logger from '../../../../utils/logger';

export class VerificationProviderFactory {
  private static mockProvider: IVerificationProvider | null = null;

  /**
   * Set a mock provider for testing
   * @param provider The mock provider to use
   */
  static setMockProvider(provider: IVerificationProvider | null) {
    this.mockProvider = provider;
  }

  static getMockProvider(): IVerificationProvider | null {
    return this.mockProvider;
  }

  /**
   * Create a verification provider instance based on the provider type
   * @param type The type of provider to create
   * @returns An instance of the specified provider
   * @throws Error if provider type is not supported
   */
  static createProvider(type: VerificationProviderType): IVerificationProvider {
    const useMockVerification = process.env.USE_MOCK_VERIFICATION === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';
    
    logger.info('Creating verification provider', { 
      type,
      useMockVerification,
      isDevelopment,
      isTest,
      hasMockProvider: !!this.mockProvider,
      mockProviderType: this.mockProvider?.getProviderType()
    });
    
    switch (type) {
      case VerificationProviderType.WHATSAPP:
        // Use mock provider if explicitly set (for testing)
        if (this.mockProvider) {
          logger.info('Using explicitly set mock provider', {
            mockProviderType: this.mockProvider.getProviderType()
          });
          return this.mockProvider;
        }
        
        // Use mock provider for development when USE_MOCK_VERIFICATION is true
        if ((isDevelopment || isTest) && useMockVerification) {
          logger.info('Using development mock provider with fixed OTP');
          const { MockWhatsAppProvider } = require('../../../mocks/mockWhatsappProvider');
          return new MockWhatsAppProvider();
        }
        
        logger.info('Using real WhatsApp provider');
        return new WhatsAppProvider();
      
      // Future provider implementations
      case VerificationProviderType.SMS:
      case VerificationProviderType.EMAIL:
        throw new Error(`Provider type ${type} not implemented yet`);
      
      default:
        logger.error('Unsupported provider type', { type });
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }
}
