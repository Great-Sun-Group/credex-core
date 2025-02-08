import axios from "../setup";
import { generateRandomPhone } from "../utils/testUtils";
import { TestCleanup } from "../utils/cleanup";
import { ledgerSpaceDriver } from "../../config/neo4j";
import { MockWhatsAppProvider } from "../../src/mocks/mockWhatsappProvider";
import { VerificationService } from "../../src/api/Member/services/verification/verificationService";
import { OTPManager } from "../../src/api/Member/services/verification/otpManager";

describe("OTP Verification Tests", () => {
  let mockProvider: MockWhatsAppProvider;
  let verificationService: VerificationService;

  beforeAll(async () => {
    // Set up mock WhatsApp provider
    mockProvider = MockWhatsAppProvider.getInstance();
    const otpManager = new OTPManager();
    const config = {
      otpExpiry: 300,
      maxDailyRequests: 5,
      cooldownMinutes: 5,
      maxAttempts: 3
    };

    // Create verification service with mock provider
    verificationService = new VerificationService({
      provider: mockProvider,
      otpManager,
      config
    });

    console.log('Test setup complete:', {
      mockProvider: !!mockProvider,
      mockProviderType: mockProvider.getProviderType()
    });
    
    // Clean up any existing test data
    await TestCleanup.cleanupMembers();
    
    // Clean up any members that might have been left from previous test runs
    const session = ledgerSpaceDriver.session();
    try {
      await session.run('MATCH (m:Member) DETACH DELETE m');
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    // Reset mock provider state
    mockProvider.resetState();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await TestCleanup.cleanupMembers();
  });

  afterEach(async () => {
    await TestCleanup.cleanupMembers();
  });

  describe("OTP Request and Verification", () => {
    it("successfully requests and verifies OTP for v2 password user", async () => {
      const phone = generateRandomPhone();
      const password = "@Testpass123";

      // Create a v2 password user in the database
      const session = ledgerSpaceDriver.session();
      const memberID = "test-v2-password-user";
      
      try {
        await session.run(`
          CREATE (m:Member {
            memberID: $memberID,
            phone: $phone,
            version: 'v2',
            authMethod: 'password',
            firstname: 'V2',
            lastname: 'Password',
            passwordHash: $passwordHash
          })
        `, { 
          memberID, 
          phone,
          passwordHash: '$2b$12$YdTBeOaejdkw2IPKYGyDKeFcFycQgNXQ69Y2IIfHpHa9uRk2C.pY6' // Hash of @Testpass123
        });
      } finally {
        await session.close();
      }

      TestCleanup.trackMember(memberID, phone);

      // Send OTP directly using verification service
      const sendResult = await verificationService.sendOTP(memberID, phone);
      expect(sendResult.success).toBe(true);

      // Get OTP from mock provider
      console.log('Checking mock provider state:', {
        mockProvider: !!mockProvider,
        mockProviderType: mockProvider.getProviderType(),
        lastOTP: mockProvider.getLastOTP()
      });
      
      const otp = mockProvider.getLastOTP();
      if (!otp) {
        throw new Error('Mock provider did not receive OTP');
      }

      // Verify OTP directly using verification service
      const verifyResult = await verificationService.verifyOTP(memberID, otp);
      expect(verifyResult.success).toBe(true);
    });

    it("rejects OTP request for v1 phone_only user", async () => {
      // Create a v1 phone_only user in the database
      const session = ledgerSpaceDriver.session();
      const phone = generateRandomPhone();
      const memberID = "test-v1-user";
      
      try {
        await session.run(`
          CREATE (m:Member {
            memberID: $memberID,
            phone: $phone,
            version: 'v1',
            authMethod: 'phone_only',
            firstname: 'V1',
            lastname: 'User'
          })
        `, { memberID, phone });
      } finally {
        await session.close();
      }

      TestCleanup.trackMember(memberID, phone);

      // Attempt to send OTP to v1 user
      const sendResult = await verificationService.sendOTP(memberID, phone);
      
      // Should be rejected because v1 users cannot use OTP
      expect(sendResult.success).toBe(false);
      expect(sendResult.error?.code).toBe('NON_PASSWORD_USER');
    });

    it("rejects OTP request for v2 non-password user", async () => {
      // Create a v2 non-password user in the database
      const session = ledgerSpaceDriver.session();
      const phone = generateRandomPhone();
      const memberID = "test-v2-nonpassword-user";
      
      try {
        await session.run(`
          CREATE (m:Member {
            memberID: $memberID,
            phone: $phone,
            version: 'v2',
            authMethod: 'phone_only',
            firstname: 'V2',
            lastname: 'NonPassword'
          })
        `, { memberID, phone });
      } finally {
        await session.close();
      }

      TestCleanup.trackMember(memberID, phone);

      // Attempt to send OTP to v2 non-password user
      const sendResult = await verificationService.sendOTP(memberID, phone);
      
      // Should be rejected because only v2 password users can use OTP
      expect(sendResult.success).toBe(false);
      expect(sendResult.error?.code).toBe('NON_PASSWORD_USER');
    });

    it("enforces rate limiting for OTP requests", async () => {
      // Create a v2 password user in the database
      const session = ledgerSpaceDriver.session();
      const phone = generateRandomPhone();
      const memberID = "test-v2-password-user-rate-limit";
      
      try {
        await session.run(`
          CREATE (m:Member {
            memberID: $memberID,
            phone: $phone,
            version: 'v2',
            authMethod: 'password',
            firstname: 'V2',
            lastname: 'Password',
            passwordHash: $passwordHash
          })
        `, { 
          memberID, 
          phone,
          passwordHash: '$2b$12$YdTBeOaejdkw2IPKYGyDKeFcFycQgNXQ69Y2IIfHpHa9uRk2C.pY6' // Hash of @Testpass123
        });
      } finally {
        await session.close();
      }

      TestCleanup.trackMember(memberID, phone);

      // First request should succeed
      const firstResult = await verificationService.sendOTP(memberID, phone);
      expect(firstResult.success).toBe(true);

      // Immediate second request should be rate limited
      const secondResult = await verificationService.sendOTP(memberID, phone);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error?.code).toBe('RATE_LIMITED');
    });
  });
});
