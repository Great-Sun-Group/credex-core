import axios from "../setup";
import { generateRandomPhone } from "../utils/testUtils";
import { TestCleanup } from "../utils/cleanup";
import { onboardMember } from "./functions/onboardMember";
import { loginV2 } from "./functions/loginV2";
import { ledgerSpaceDriver } from "../../config/neo4j";
import { v4 as uuidv4 } from 'uuid';
import { MockWhatsAppProvider } from "../../src/mocks/mockWhatsappProvider";
import { VerificationService } from "../../src/api/Member/services/verification/verificationService";
import { OTPManager } from "../../src/api/Member/services/verification/otpManager";
import { VerificationProviderFactory } from "../../src/api/Member/services/verification/providerFactory";

describe('Password Reset Flow', () => {
  const testPhone = generateRandomPhone();
  const testPassword = 'TestPass123!';
  let testMemberID: string;
  let authToken: string;
  let mockProvider: MockWhatsAppProvider;

  beforeAll(async () => {
    // Set up mock provider
    mockProvider = new MockWhatsAppProvider();
    VerificationProviderFactory.setMockProvider(mockProvider);

    // Clean up any existing test data
    await TestCleanup.cleanupMembers();
    
    // Create test member with initial password
    const onboardResponse = await onboardMember(
      "Test",
      "User",
      testPhone,
      "USD",
      testPassword
    );

    testMemberID = onboardResponse.data.action.details.memberID;
    TestCleanup.trackMember(testMemberID, testPhone);

    // Login to get auth token
    const loginResponse = await loginV2(testPhone, testPassword);
    authToken = loginResponse.data.action.details.token;
  });

  afterAll(async () => {
    // Reset mock provider
    mockProvider.resetState();
    VerificationProviderFactory.setMockProvider(null);
    await TestCleanup.cleanupMembers();
  });

  it('should complete the password reset flow successfully', async () => {
    console.log('\n=== Starting password reset flow test ===');
    console.log('Test member details:', { testMemberID, testPhone });

    console.log('\n1. Requesting OTP...');
    const requestOtpResponse = await axios.post('verify/requestOtp', {
      memberID: testMemberID,
      phone: testPhone,
      purpose: 'PASSWORD_RESET'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('OTP Request Response:', {
      status: requestOtpResponse.status,
      data: requestOtpResponse.data
    });

    expect(requestOtpResponse.status).toBe(200);
    expect(requestOtpResponse.data.data.action.details.memberID).toBe(testMemberID);
    expect(requestOtpResponse.data.data.action.details.phone).toBe(testPhone);
    expect(requestOtpResponse.data.data.action.details.expiresIn).toBeDefined();

    // Use a hardcoded OTP instead of getting it from the mock provider
    console.log('\n2. Using hardcoded OTP for testing...');
    const otp = '123456';
    console.log('Using hardcoded OTP:', { otp });
    
    // Store the OTP in the database directly
    const session = ledgerSpaceDriver.session();
    const bcrypt = require('bcrypt');
    const hashedOTP = await bcrypt.hash(otp, 10);
    await session.run(
      `MATCH (m:Member {memberID: $memberID})
       SET m.hashedOTP = $hashedOTP,
           m.otpExpiry = datetime().epochSeconds + 600,
           m.otpAttempts = 0`,
      { memberID: testMemberID, hashedOTP }
    );
    await session.close();
    
    console.log('Stored OTP in database directly');

    // Verify OTP with PASSWORD_RESET purpose
    console.log('\n3. Verifying OTP...');
    const verifyOtpResponse = await axios.post('verify/verifyOtp', {
      memberID: testMemberID,
      otp,
      purpose: 'PASSWORD_RESET'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('Verify OTP Response:', {
      status: verifyOtpResponse.status,
      data: verifyOtpResponse.data
    });

    expect(verifyOtpResponse.status).toBe(200);
    expect(verifyOtpResponse.data.data.action.details.memberID).toBe(testMemberID);
    expect(verifyOtpResponse.data.data.action.details.otpVerified).toBe(true);
    expect(verifyOtpResponse.data.data.action.details.resetToken).toBeDefined();
    expect(verifyOtpResponse.data.data.action.details.purpose).toBe('PASSWORD_RESET');
    expect(verifyOtpResponse.data.data.action.details.expiresIn).toBeDefined();

    const resetToken = verifyOtpResponse.data.data.action.details.resetToken;
    console.log('Reset token received:', resetToken);

    // Reset password using token
    console.log('\n4. Resetting password...');
    const newPassword = 'NewTestPass123!';
    const resetPasswordResponse = await axios.post('resetPassword', {
      resetToken,
      newPassword
    });

    console.log('Reset Password Response:', {
      status: resetPasswordResponse.status,
      data: resetPasswordResponse.data
    });

    expect(resetPasswordResponse.status).toBe(200);
    expect(resetPasswordResponse.data.data.action.details.memberID).toBe(testMemberID);

    // Verify can login with new password
    console.log('\n5. Verifying login with new password...');
    const finalLoginResponse = await axios.post('v2/login', {
      phone: testPhone,
      password: newPassword
    });

    console.log('Login Response:', {
      status: finalLoginResponse.status,
      data: finalLoginResponse.data
    });

    expect(finalLoginResponse.status).toBe(200);
    expect(finalLoginResponse.data.data.action.details.memberID).toBe(testMemberID);
    
    console.log('\n=== Password reset flow test completed ===\n');
  });

  it('should fail with invalid reset token', async () => {
    try {
      const invalidToken = uuidv4();
      const newPassword = 'NewTestPass123!';

      const response = await axios.post('resetPassword', {
        resetToken: invalidToken,
        newPassword
      });
      // If we get here, the request succeeded when it should have failed
      expect(response).toBe(undefined);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.type).toBe('ERROR_VALIDATION');
    }
  });

  it('should fail with expired reset token', async () => {
    try {
      // Generate a reset token directly in the database to bypass rate limiting
      const resetToken = uuidv4();
      const session = ledgerSpaceDriver.session();
      await session.run(
        `MATCH (m:Member {memberID: $memberID})
         SET m.resetToken = $resetToken,
             m.resetTokenExpiry = datetime().epochSeconds - 1`,
        { memberID: testMemberID, resetToken }
      );
      await session.close();


      // Attempt to use expired token
      const response = await axios.post('resetPassword', {
        resetToken,
        newPassword: 'NewTestPass123!'
      });
      // If we get here, the request succeeded when it should have failed
      expect(response).toBe(undefined);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.type).toBe('ERROR_VALIDATION');
      expect(error.response.data.data.action.details.code).toBe('TOKEN_EXPIRED');
    }
  });

  it('should fail without purpose field', async () => {
    try {
      const response = await axios.post('verify/requestOtp', {
        memberID: testMemberID,
        phone: testPhone
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      // If we get here, the request succeeded when it should have failed
      expect(response).toBe(undefined);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.type).toBe('ERROR_VALIDATION');
    }
  });

  it('should fail with invalid purpose value', async () => {
    try {
      const response = await axios.post('verify/requestOtp', {
        memberID: testMemberID,
        phone: testPhone,
        purpose: 'INVALID_PURPOSE'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      // If we get here, the request succeeded when it should have failed
      expect(response).toBe(undefined);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.type).toBe('ERROR_VALIDATION');
    }
  });

  it('should fail when verifying OTP without purpose field', async () => {
    try {
      const response = await axios.post('verify/verifyOtp', {
        memberID: testMemberID,
        otp: '123456'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      // If we get here, the request succeeded when it should have failed
      expect(response).toBe(undefined);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.type).toBe('ERROR_VALIDATION');
    }
  });

  it('should fail when verifying OTP with invalid purpose value', async () => {
    try {
      const response = await axios.post('verify/verifyOtp', {
        memberID: testMemberID,
        otp: '123456',
        purpose: 'INVALID_PURPOSE'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      // If we get here, the request succeeded when it should have failed
      expect(response).toBe(undefined);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.type).toBe('ERROR_VALIDATION');
    }
  });

  it('should fail with weak password', async () => {
    try {
      // Generate a reset token directly in the database to bypass rate limiting
      const resetToken = uuidv4();
      const session = ledgerSpaceDriver.session();
      await session.run(
        `MATCH (m:Member {memberID: $memberID})
         SET m.resetToken = $resetToken,
             m.resetTokenExpiry = datetime().epochSeconds + 600`, // 10 minutes from now
        { memberID: testMemberID, resetToken }
      );
      await session.close();

      // Test various weak passwords
      const weakPasswords = [
        'short1!',           // Too short
        'nouppercasepass1!', // No uppercase
        'NOLOWERCASEPASS1!', // No lowercase
        'NoSpecialChar123',  // No special char
        'NoNumber@Pass',     // No number
        'a'.repeat(129)      // Too long
      ];

      for (const weakPassword of weakPasswords) {
        try {
          const response = await axios.post('resetPassword', {
            resetToken,
            newPassword: weakPassword
          });
          // If we get here, the request succeeded when it should have failed
          expect(response).toBe(undefined);
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.data.action.type).toBe('ERROR_VALIDATION');
        }
      }
    } catch (error: any) {
      // If we get an error during setup (OTP request/verify), make the test fail
      expect(error.message).toBe('');
    }
  });
});
