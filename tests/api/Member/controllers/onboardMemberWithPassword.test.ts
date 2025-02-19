import request from 'supertest';
import initializeApp from '../../../../src/index';
import { ledgerSpaceDriver } from '../../../../config/neo4j';
import { passwordService } from '../../../../src/api/Member/services/PasswordService';
import { generateRandomPhone } from '../../../utils/testUtils';

describe('OnboardMemberController with Password', () => {
  const testMember = {
    firstname: 'Test',
    lastname: 'User',
    phone: generateRandomPhone(),
    defaultDenom: 'USD',
    password: 'SecurePass123!'
  };

  let memberID: string;
  let app: any;
  let createdMemberIDs: string[] = [];

  beforeAll(async () => {
    app = await initializeApp();
  });

  afterEach(async () => {
    const session = ledgerSpaceDriver.session();
    try {
      // Delete any members created by phone number
      await session.run(
        'MATCH (m:Member) WHERE m.memberID IN $memberIDs DETACH DELETE m',
        { memberIDs: createdMemberIDs }
      );
      // Also delete by memberID if we have it
      for (const id of createdMemberIDs) {
        await session.run(
          'MATCH (m:Member {memberID: $memberID}) DETACH DELETE m',
          { memberID: id }
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

  it('should successfully onboard member with password', async () => {
    const response = await request(app)
      .post('/onboardMember')
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        ...testMember,
        phone: generateRandomPhone()
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toContain('Personal account created');
    expect(response.body.data.action.type).toBe('MEMBER_ONBOARDED');
    
    memberID = response.body.data.action.details.memberID;
    createdMemberIDs.push(memberID);

    // Verify password was stored correctly
    const session = ledgerSpaceDriver.session();
    try {
      const result = await session.run(
        `MATCH (m:Member {memberID: $memberID}) 
         RETURN m.passwordHash as hash, m.passwordLastChanged as lastChanged`,
        { memberID }
      );

      const hash = result.records[0].get('hash');
      const lastChanged = result.records[0].get('lastChanged');

      // Verify password hash works
      const isValid = await passwordService.verifyPassword(testMember.password, hash);
      expect(isValid).toBe(true);

      // Verify passwordLastChanged was set
      expect(lastChanged).toBeDefined();
      expect(new Date(lastChanged).getTime()).toBeLessThanOrEqual(Date.now());
    } finally {
      await session.close();
    }
  });

  it('should successfully onboard member without password', async () => {
    const { password, ...memberWithoutPassword } = testMember;

    const response = await request(app)
      .post('/onboardMember')
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        ...memberWithoutPassword,
        phone: generateRandomPhone()
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toContain('Personal account created');
    expect(response.body.data.action.type).toBe('MEMBER_ONBOARDED');
    
    memberID = response.body.data.action.details.memberID;
    createdMemberIDs.push(memberID);

    // Verify no password was stored
    const session = ledgerSpaceDriver.session();
    try {
      const result = await session.run(
        `MATCH (m:Member {memberID: $memberID}) 
         RETURN m.passwordHash as hash, m.passwordLastChanged as lastChanged`,
        { memberID }
      );

      const hash = result.records[0].get('hash');
      const lastChanged = result.records[0].get('lastChanged');

      expect(hash).toBeNull();
      expect(lastChanged).toBeNull();
    } finally {
      await session.close();
    }
  });

  it('should reject onboarding with invalid password', async () => {
    const response = await request(app)
      .post('/onboardMember')
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        ...testMember,
        phone: generateRandomPhone(),
        password: 'weak'
      });

    expect(response.status).toBe(400);
    expect(response.body.data.action.type).toBe('ERROR_VALIDATION');
    expect(response.body.data.action.details.reason).toContain('Password must be at least 10 characters');
  });

  it('should reject onboarding with missing required fields but valid password', async () => {
    const response = await request(app)
      .post('/onboardMember')
      .set('x-client-api-key', process.env.CLIENT_API_KEY || '')
      .send({
        firstname: testMember.firstname,
        password: testMember.password
        // Missing other required fields
      });

    expect(response.status).toBe(400);
    expect(response.body.data.action.type).toBe('ERROR_VALIDATION');
    expect(response.body.data.action.details.code).toBe('VALIDATION_ERROR');
  });
});
