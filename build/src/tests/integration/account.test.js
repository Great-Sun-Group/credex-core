"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../index"); // Adjust this import based on your app structure
const neo4j_1 = require("../../../config/neo4j");
describe('Account API Integration Tests', () => {
    beforeAll(async () => {
        // Set up any necessary test data
    });
    afterAll(async () => {
        // Clean up test data and close connections
        await neo4j_1.ledgerSpaceDriver.close();
    });
    describe('POST /api/v1/createAccount', () => {
        it('should create a new account with valid input', async () => {
            const response = await (0, supertest_1.default)(index_1.app)
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
            const response = await (0, supertest_1.default)(index_1.app)
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
            const response = await (0, supertest_1.default)(index_1.app)
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
            const response = await (0, supertest_1.default)(index_1.app)
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
//# sourceMappingURL=account.test.js.map