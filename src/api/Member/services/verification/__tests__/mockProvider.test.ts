import { MockWhatsAppProvider } from '../../../../../mocks/mockWhatsappProvider';
import { VerificationProviderType } from '../types';

describe('MockWhatsAppProvider', () => {
  let mockProvider: MockWhatsAppProvider;

  beforeEach(() => {
    mockProvider = new MockWhatsAppProvider();
    // Set environment variables for testing
    process.env.NODE_ENV = 'development';
    process.env.USE_MOCK_VERIFICATION = 'true';
  });

  afterEach(() => {
    mockProvider.resetState();
    delete process.env.NODE_ENV;
    delete process.env.USE_MOCK_VERIFICATION;
  });

  it('should return correct provider type', () => {
    expect(mockProvider.getProviderType()).toBe(VerificationProviderType.WHATSAPP);
  });

  it('should use fixed OTP 123456 in development mode', async () => {
    const result = await mockProvider.sendOTP('+1234567890', 'random-otp');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('development mock');
    expect(result.message).toContain('123456');
    expect(result.data).toBeDefined();
    expect((result.data as any)?.devOTP).toBe('123456');
    expect(mockProvider.getLastOTP()).toBe('123456');
  });

  it('should use provided OTP when not in development mode', async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_MOCK_VERIFICATION = 'false';
    
    const testOTP = '987654';
    const result = await mockProvider.sendOTP('+1234567890', testOTP);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('OTP sent successfully (mock)');
    expect(mockProvider.getLastOTP()).toBe(testOTP);
  });

  it('should validate delivery successfully', async () => {
    const isValid = await mockProvider.validateDelivery('mock-delivery-id');
    expect(isValid).toBe(true);
  });

  it('should return development OTP', () => {
    expect(mockProvider.getDevOTP()).toBe('123456');
  });

  it('should reset state correctly', () => {
    mockProvider.sendOTP('+1234567890', 'test-otp');
    expect(mockProvider.getLastOTP()).toBeTruthy();
    
    mockProvider.resetState();
    expect(mockProvider.getLastOTP()).toBeNull();
  });
});
