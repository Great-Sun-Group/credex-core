import request from 'supertest';
import { app } from '../../index'; // Adjust this import based on your app structure
import { ledgerSpaceDriver } from '../../../config/neo4j';

describe('Account API Integration Tests', () => {
  beforeAll(async () => {
    // Set up any necessary test data
  });

  afterAll(async () => {
    // Clean up test data and close connections
    await ledgerSpaceDriver.close();
  });

  describe('POST /api/v1/createAccount', () => {
    it('should create a new account with valid input', async () => {
      const response = await request(app)
        .post('/api/v1/createAccount')
        .send({
          ownerID: '123e4567-e89b-12d3-a456-426614174000',
          accountType: 'PERSONAL_CONSUMPTION',
          accountName: 'Test Account',
          accountHandle: 'test_account',
          defaultDenom: 'USD'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accountID');
    });

    it('should return 400 with invalid input', async () => {
      const response = await request(app)
        .post('/api/v1/createAccount')
        .send({
          ownerID: 'invalid-uuid',
          accountType: 'INVALID_TYPE',
          accountName: 'T', // Too short
          accountHandle: 'invalid handle',
          defaultDenom: 'INVALID_DENOM'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/v1/updateAccount', () => {
    it('should update an account with valid input', async () => {
      const response = await request(app)
        .patch('/api/v1/updateAccount')
        .send({
          ownerID: '123e4567-e89b-12d3-a456-426614174000',
          accountID: '123e4567-e89b-12d3-a456-426614174001',
          accountName: 'Updated Account Name',
          accountHandle: 'updated_handle'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Account updated successfully');
    });

    it('should return 400 with invalid input', async () => {
      const response = await request(app)
        .patch('/api/v1/updateAccount')
        .send({
          ownerID: 'invalid-uuid',
          accountID: 'invalid-uuid',
          accountName: 'A', // Too short
          accountHandle: 'invalid handle'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  // Add more test cases for other account-related endpoints
});