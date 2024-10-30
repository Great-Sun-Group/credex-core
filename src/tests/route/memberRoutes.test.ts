import request from 'supertest';
import express from 'express';
import MemberRoutes from '../../api/Member/memberRoutes';
import { OnboardMemberService } from '../../api/Member/services/OnboardMember';
import { CreateAccountService } from '../../api/Account/services/CreateAccount';
import { GetMemberDashboardByPhoneService } from '../../api/Member/services/GetMemberDashboardByPhone';
import { generateToken } from '@config/authenticate';
import { searchSpaceDriver } from '@config/neo4j';
import logger from '@utils/logger';

process.env.NODE_ENV = 'test';

// Mocking modules
jest.mock('../../api/Member/services/OnboardMember');
jest.mock('../../api/Account/services/CreateAccount');
jest.mock('../../api/Member/services/GetMemberDashboardByPhone');
jest.mock('@config/authenticate');
jest.mock('@config/neo4j');

let app: express.Application;

describe('Member Routes', () => {
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', MemberRoutes(express.json(), '/api/v1'));

    // Mock logger to reduce noise during testing
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should log in a member successfully', async () => {
    const res = await request(app)
      .post('/api/v1/member/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toEqual(200);  // Replace with the expected response code
    expect(res.body).toHaveProperty('token'); // Replace with the actual response structure
  });

  it('should fail to onboard member with invalid data', async () => {
    const res = await request(app)
      .post('/api/v1/member/onboardMember')
      .send({
        invalidKey: 'invalidData'
      });

    expect(res.statusCode).toEqual(400);  // Expecting validation to fail
    expect(res.body).toHaveProperty('message', 'Validation failed'); // Replace with actual error message
  });

  it('should onboard member successfully', async () => {
    // Mock services
    (OnboardMemberService as jest.Mock).mockResolvedValueOnce({
      onboardedMemberID: 'test-member-id',
      message: 'member onboarded',
    });

    (CreateAccountService as jest.Mock).mockResolvedValueOnce({
      accountID: 'test-account-id',
      message: 'account created',
    });

    (GetMemberDashboardByPhoneService as jest.Mock).mockResolvedValueOnce({
      // Mocked dashboard data
      memberID: 'test-member-id',
      accounts: [],
    });

    (generateToken as jest.Mock).mockReturnValue('test-token');

    const mockSession = {
      run: jest.fn().mockResolvedValue({}),
      close: jest.fn(),
    };

    (searchSpaceDriver as jest.Mock).mockReturnValue({
      session: () => mockSession,
    });

    const res = await request(app)
      .post('/api/v1/member/onboardMember')
      .send({
        firstname: 'John',
        lastname: 'Doe',
        phone: '1234567890',
        defaultDenom: 'USD',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('memberDashboard');
    expect(res.body).toHaveProperty('token', 'test-token');
    expect(res.body).toHaveProperty('defaultAccountID', 'test-account-id');
  });

  // Add more tests as needed
});
