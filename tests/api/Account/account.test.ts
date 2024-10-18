import axios from '../../setup';

describe('Account API Tests', () => {
  let testMemberID: string;
  let testAccountID: string;

  beforeAll(async () => {
    // Create a test member to use in account tests
    const createMemberResponse = await axios.post('/api/v1/member/onboardMember', {
      firstname: 'Test',
      lastname: 'User',
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      defaultDenom: 'USD'
    });
    testMemberID = createMemberResponse.data.memberDashboard.memberID;
  });

  describe('Account Endpoints', () => {
    it('should create a new account successfully', async () => {
      const createAccountData = {
        memberID: testMemberID,
        accountName: 'Test Account',
        accountHandle: `test_account_${Date.now()}`
      };

      const response = await axios.post('/api/v1/account/createAccount', createAccountData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accountID');
      expect(response.data.accountName).toBe(createAccountData.accountName);
      expect(response.data.accountHandle).toBe(createAccountData.accountHandle);

      testAccountID = response.data.accountID;
    });

    it('should get account details successfully', async () => {
      const response = await axios.get('/api/v1/account/getAccount', {
        params: { accountID: testAccountID }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accountID', testAccountID);
      expect(response.data).toHaveProperty('accountName');
      expect(response.data).toHaveProperty('accountHandle');
    });

    // Add more tests for other account endpoints here
    // For example:
    // - Update account
    // - Get account balances
    // - Get account transactions
    // etc.
  });
});
