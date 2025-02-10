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
    // Clean up any existing test data
    await TestCleanup.cleanupMembers();
    
    // Clean up any members that might have been left from previous test runs
    const session = ledgerSpaceDriver.session();
    try {
      await session.run('MATCH (m:Member) DETACH DELETE m');
    } finally {
      await session.close();
    }

    // Set up verification service with mock provider for testing
    mockProvider = new MockWhatsAppProvider();
    verificationService = new VerificationService({
      provider: mockProvider,
      otpManager: new OTPManager(),
      config: {
        otpExpiry: 300,
        maxDailyRequests: 5,
        cooldownMinutes: 5,
        maxAttempts: 3
      }
    });
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
            passwordHash: $passwordHash,
            memberHandle: $phone
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
      
      const otp = mockProvider.getLastOTP();
      if (!otp) {
        throw new Error('Mock provider did not receive OTP');
      }

      // Verify OTP directly using verification service
      const verifyResult = await verificationService.verifyOTP(memberID, otp);
      expect(verifyResult.success).toBe(true);
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
            passwordHash: $passwordHash,
            memberHandle: $phone
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
