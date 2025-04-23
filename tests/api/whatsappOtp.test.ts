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

  describe("OTP Rate Limiting Reset", () => {
    it("should reset OTP counter when the last request was on a previous day", async () => {
      // Create a test member
      const session = ledgerSpaceDriver.session();
      const phone = generateRandomPhone();
      const memberID = "test-otp-reset-member";
      
      try {
        // Create member with max daily requests reached but last request was yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        await session.run(`
          CREATE (m:Member {
            memberID: $memberID,
            phone: $phone,
            version: 'v2',
            authMethod: 'password',
            firstname: 'Test',
            lastname: 'User',
            passwordHash: $passwordHash,
            memberHandle: $phone,
            otpRequestsToday: 5,
            lastOtpRequest: $lastRequest
          })
        `, { 
          memberID, 
          phone,
          passwordHash: '$2b$12$YdTBeOaejdkw2IPKYGyDKeFcFycQgNXQ69Y2IIfHpHa9uRk2C.pY6',
          lastRequest: yesterday.toISOString()
        });
      } finally {
        await session.close();
      }

      TestCleanup.trackMember(memberID, phone);

      // Send OTP - should succeed because last request was yesterday and counter should be reset
      const result = await verificationService.sendOTP(memberID, phone);
      
      // Verify that the OTP was sent successfully
      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP sent successfully');
      
      // Verify the counter was reset in the database
      const verifySession = ledgerSpaceDriver.session();
      try {
        const verifyResult = await verifySession.run(
          `MATCH (m:Member {memberID: $memberID}) RETURN m.otpRequestsToday as requests`,
          { memberID }
        );
        
        // Should be reset to 0 and then incremented to 1 (since we sent an OTP)
        const requests = verifyResult.records[0].get('requests');
        expect(requests.low).toBe(1);
        expect(requests.high).toBe(0);
      } finally {
        await verifySession.close();
      }
    });

    it("should not reset OTP counter when the last request was today", async () => {
      // Create a test member
      const session = ledgerSpaceDriver.session();
      const phone = generateRandomPhone();
      const memberID = "test-otp-no-reset-member";
      
      try {
        // Create member with max daily requests reached and last request was today
        const today = new Date();
        
        await session.run(`
          CREATE (m:Member {
            memberID: $memberID,
            phone: $phone,
            version: 'v2',
            authMethod: 'password',
            firstname: 'Test',
            lastname: 'User',
            passwordHash: $passwordHash,
            memberHandle: $phone,
            otpRequestsToday: 5,
            lastOtpRequest: $lastRequest
          })
        `, { 
          memberID, 
          phone,
          passwordHash: '$2b$12$YdTBeOaejdkw2IPKYGyDKeFcFycQgNXQ69Y2IIfHpHa9uRk2C.pY6',
          lastRequest: today.toISOString()
        });
      } finally {
        await session.close();
      }

      TestCleanup.trackMember(memberID, phone);

      // Send OTP - should fail because max requests reached today
      const result = await verificationService.sendOTP(memberID, phone);
      
      // Verify that the OTP was not sent due to rate limiting
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.message).toBe('Daily OTP request limit exceeded');
      
      // Verify the counter was NOT reset in the database
      const verifySession = ledgerSpaceDriver.session();
      try {
        const verifyResult = await verifySession.run(
          `MATCH (m:Member {memberID: $memberID}) RETURN m.otpRequestsToday as requests`,
          { memberID }
        );
        
        // Should still be 5
        const requests = verifyResult.records[0].get('requests');
        expect(requests.low).toBe(5);
        expect(requests.high).toBe(0);
      } finally {
        await verifySession.close();
      }
    });
  });
});
