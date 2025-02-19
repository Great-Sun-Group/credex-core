import { OnboardMemberService } from '../../../../src/api/Member/services/OnboardMember';
import { passwordService } from '../../../../src/api/Member/services/PasswordService';
import { generateToken } from '../../../../config/authenticate';
import { ledgerSpaceDriver } from '../../../../config/neo4j';
import request from 'supertest';
import initializeApp from '../../../../src/index';
import { generateRandomPhone } from '../../../utils/testUtils';

describe('UpdatePasswordController', () => {
  const testMember = {
    firstname: 'Test',
    lastname: 'User',
    phone: generateRandomPhone(),
    defaultDenom: 'USD',
    password: 'InitialPass123!'
  };

  let memberID: string;
  let authToken: string;
  let app: any;
  let createdMemberIDs: string[] = [];

  beforeAll(async () => {
    app = await initializeApp();
    
    // Create a test member with initial password
    const result = await OnboardMemberService(
      testMember.firstname,
      testMember.lastname,
      testMember.phone,
      testMember.defaultDenom,
      testMember.password,
      'test-request-id'
    );

    if (!result.success || !result.data) {
      throw new Error('Failed to create test member');
    }

    memberID = result.data.memberID;
    createdMemberIDs.push(memberID);
    authToken = await generateToken(memberID);
  });

  afterEach(async () => {
    const session = ledgerSpaceDriver.session();
    try {
      // Delete members by memberID
      if (createdMemberIDs.length > 0) {
        await session.run(
          'MATCH (m:Member) WHERE m.memberID IN $memberIDs DETACH DELETE m',
          { memberIDs: createdMemberIDs }
        );
      }
      createdMemberIDs = []; // Reset the array
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    // Final cleanup
    const session = ledgerSpaceDriver.session();
    try {
      if (createdMemberIDs.length > 0) {
        await session.run(
          'MATCH (m:Member) WHERE m.memberID IN $memberIDs DETACH DELETE m',
          { memberIDs: createdMemberIDs }
        );
      }
    } finally {
      await session.close();
    }
  });

  it('should successfully update password with valid credentials', async () => {
    const newPassword = 'NewSecurePass123!';

    const response = await request(app)
      .post('/updatePassword')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        currentPassword: testMember.password,
        newPassword
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password updated successfully');
    expect(response.body.data.action.type).toBe('MEMBER_PASSWORD_UPDATED');
    expect(response.body.data.action.id).toBe(memberID);

    // Verify new password works
    const session = ledgerSpaceDriver.session();
    try {
      const result = await session.run(
        'MATCH (m:Member {memberID: $memberID}) RETURN m.passwordHash as hash',
        { memberID }
      );
      const hash = result.records[0].get('hash');
      const isValid = await passwordService.verifyPassword(newPassword, hash);
      expect(isValid).toBe(true);
    } finally {
      await session.close();
    }
  });

  it('should reject update with incorrect current password', async () => {
    // Create a new member for this test to avoid state issues
    const result = await OnboardMemberService(
      testMember.firstname,
      testMember.lastname,
      generateRandomPhone(),
      testMember.defaultDenom,
      testMember.password,
      'test-request-id'
    );

    if (!result.success || !result.data) {
      throw new Error('Failed to create test member');
    }

    const testMemberID = result.data.memberID;
    createdMemberIDs.push(testMemberID);
    const testAuthToken = await generateToken(testMemberID);

    const response = await request(app)
      .post('/updatePassword')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        currentPassword: 'WrongPass123!',
        newPassword: 'NewSecurePass123!'
      });

    expect(response.status).toBe(401);
    expect(response.body.data.action.type).toBe('ERROR_VALIDATION');
    expect(response.body.data.action.details.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('should reject update with invalid new password', async () => {
    // Create a new member for this test
    const result = await OnboardMemberService(
      testMember.firstname,
      testMember.lastname,
      generateRandomPhone(),
      testMember.defaultDenom,
      testMember.password,
      'test-request-id'
    );

    if (!result.success || !result.data) {
      throw new Error('Failed to create test member');
    }

    const testMemberID = result.data.memberID;
    createdMemberIDs.push(testMemberID);
    const testAuthToken = await generateToken(testMemberID);

    const response = await request(app)
      .post('/updatePassword')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        currentPassword: testMember.password,
        newPassword: 'weak'
      });

    expect(response.status).toBe(400);
    expect(response.body.data.action.type).toBe('ERROR_VALIDATION');
    expect(response.body.data.action.details.reason).toContain('Password must be at least 10 characters');
  });

  it('should reject update without authentication', async () => {
    const response = await request(app)
      .post('/updatePassword')
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        currentPassword: testMember.password,
        newPassword: 'NewSecurePass123!'
      });

    expect(response.status).toBe(401);
  });

  it('should reject update with missing parameters', async () => {
    // Create a new member for this test
    const result = await OnboardMemberService(
      testMember.firstname,
      testMember.lastname,
      generateRandomPhone(),
      testMember.defaultDenom,
      testMember.password,
      'test-request-id'
    );

    if (!result.success || !result.data) {
      throw new Error('Failed to create test member');
    }

    const testMemberID = result.data.memberID;
    createdMemberIDs.push(testMemberID);
    const testAuthToken = await generateToken(testMemberID);

    const response = await request(app)
      .post('/updatePassword')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        currentPassword: testMember.password
        // missing newPassword
      });

    expect(response.status).toBe(400);
    expect(response.body.data.action.type).toBe('ERROR_VALIDATION');
    expect(response.body.data.action.details.code).toBe('VALIDATION_ERROR');
  });
});
