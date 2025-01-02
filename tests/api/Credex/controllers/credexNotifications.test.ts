import { notificationService } from '../../../../src/api/Notifications/NotificationService';
import { CreateCredexController } from '../../../../src/api/Credex/controllers/createCredex';
import { CancelCredexController } from '../../../../src/api/Credex/controllers/cancelCredex';
import { AcceptCredexController } from '../../../../src/api/Credex/controllers/acceptCredex';
import { DeclineCredexController } from '../../../../src/api/Credex/controllers/declineCredex';
import { MemberDashboardService } from '../../../../src/api/Member/services/MemberDashboardService';

// Mock notification service
jest.mock('../../../../src/api/Notifications/NotificationService', () => ({
  notificationService: {
    sendNotification: jest.fn()
  }
}));

// Mock services and dependencies
jest.mock('../../../../src/api/Member/services/AuthForTierSpendLimit', () => ({
  AuthForTierSpendLimitService: jest.fn().mockImplementation(
    (issuerAccountID, amount, denomination, securedCredex, requestId) => 
      Promise.resolve({ success: true, authorized: true })
  )
}));


jest.mock('../../../../config/neo4j', () => ({
  ledgerSpaceDriver: {
    session: jest.fn().mockReturnValue({
      executeWrite: jest.fn().mockImplementation(async (callback) => callback({
        run: jest.fn().mockResolvedValue({ records: [] })
      })),
      executeRead: jest.fn().mockImplementation(async (callback) => callback({
        run: jest.fn().mockResolvedValue({ records: [] })
      })),
      close: jest.fn()
    })
  }
}));

jest.mock('../../../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../../../src/utils/denomUtils', () => ({
  denomFormatter: jest.fn().mockImplementation((amount) => amount.toString())
}));

jest.mock('../../../../src/utils/digitalSignature', () => ({
  digitallySign: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../../src/core-cron/constants/credspan', () => ({
  checkDueDate: jest.fn().mockResolvedValue(true),
  credspan: 7 * 24 * 60 * 60 * 1000
}));

jest.mock('../../../../src/utils/dashboardUtils', () => ({
  getDashboardData: jest.fn().mockResolvedValue({
    member: {},
    account: {}
  })
}));

// Mock all required services
jest.mock('../../../../src/api/Member/services/SpendLimitService', () => ({
  SpendLimitService: jest.fn().mockImplementation(() => ({
    checkTierSpendLimit: jest.fn().mockResolvedValue({ success: true })
  }))
}));

jest.mock('../../../../src/api/Member/repositories/MemberRepository', () => ({
  MemberRepository: jest.fn().mockImplementation(() => ({
    getMemberByID: jest.fn().mockResolvedValue({ memberID: 'test-member' }),
    getAccountsByMemberID: jest.fn().mockResolvedValue([{ accountID: 'test-account' }])
  }))
}));

jest.mock('../../../../src/api/Account/repositories/AccountRepository', () => ({
  AccountRepository: jest.fn().mockImplementation(() => ({
    getAccountByID: jest.fn().mockResolvedValue({ accountID: 'test-account', accountName: 'Test Account' })
  }))
}));

jest.mock('../../../../src/api/Credex/services/CreateCredex', () => ({
  CreateCredexService: jest.fn().mockImplementation((params: {
    signerID: string;
    issuerAccountID: string;
    receiverAccountID: string;
    InitialAmount: number;
    Denomination: string;
    credexType: string;
    OFFERSorREQUESTS: "OFFERS" | "REQUESTS";
    securedCredex: boolean;
    dueDate?: string;
    requestId: string;
  }) => {
    const amount = params.InitialAmount.toString();
    return Promise.resolve({
      success: true,
      data: {
        credexID: 'test-credex',
        formattedInitialAmount: amount,
        amount: amount,
        counterpartyAccountName: 'Test Receiver',
        secured: params.securedCredex,
        dueDate: params.dueDate,
        transactionType: params.OFFERSorREQUESTS,
        issuerAccountID: params.issuerAccountID,
        issuerAccountName: 'Test Issuer',
        receiverAccountID: params.receiverAccountID,
        receiverMemberID: 'receiver-member',
        issuerMemberID: 'issuer-member',
        createdAt: new Date().toISOString(),
        cxxMultiplier: 1,
        denomination: params.Denomination,
        InitialAmount: amount,
        OutstandingAmount: amount,
        RedeemedAmount: "0",
        DefaultedAmount: "0",
        WrittenOffAmount: "0"
      },
      message: 'Credex created successfully'
    });
  })
}));


jest.mock('../../../../src/api/Credex/services/CancelCredex', () => ({
  CancelCredexService: jest.fn()
}));

jest.mock('../../../../src/api/Credex/services/AcceptCredex', () => ({
  AcceptCredexService: jest.fn()
}));

jest.mock('../../../../src/api/Credex/services/DeclineCredex', () => ({
  DeclineCredexService: jest.fn()
}));

jest.mock('../../../../src/api/Member/services/MemberDashboardService');

describe('Credex Controller Notifications', () => {
  beforeAll(() => {
    // Initialize any global test setup
    jest.clearAllMocks();
  });
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

      mockReq = {
        id: 'test-request-id',
        requestId: 'test-request-id',
        user: {
          memberID: 'test-member',
          accountID: 'test-account'
        },
        body: {}
      };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('CreateCredexController', () => {
    it('should send notification on successful offer creation', async () => {



      mockReq.body = {
        issuerAccountID: 'test-account',
        receiverAccountID: 'receiver-account',
        InitialAmount: "100",
        Denomination: 'USD',
        securedCredex: false,
        credexType: 'PURCHASE',
        OFFERSorREQUESTS: 'OFFERS',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
      };

      await CreateCredexController(mockReq, mockRes, mockNext);

      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        type: 'OFFER_CREATED',
        recipientID: 'receiver-member',
        data: expect.objectContaining({
          credexID: 'test-credex',
          amount: expect.any(String),
          denomination: 'USD',
          counterpartyName: expect.any(String)
        })
      });
    });
  });

  describe('CancelCredexController', () => {
    it('should send notification on successful offer cancellation', async () => {
      const mockCredexData = {
        success: true,
        data: {
          credexID: 'test-credex',
          receiverMemberID: 'receiver-member',
          issuerAccountName: 'Test Issuer',
          denomination: 'USD'
        }
      };

      require('../../../../src/api/Credex/services/CancelCredex').CancelCredexService.mockResolvedValue(mockCredexData);

      mockReq.body = {
        credexID: 'test-credex'
      };

      await CancelCredexController(mockReq, mockRes, mockNext);

      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        type: 'OFFER_CANCELLED',
        recipientID: 'receiver-member',
        data: expect.objectContaining({
          credexID: 'test-credex',
          denomination: 'USD',
          counterpartyName: expect.any(String)
        })
      });
    });
  });

  describe('AcceptCredexController', () => {
    it('should send notification on successful offer acceptance', async () => {
      const mockCredexData = {
        success: true,
        data: {
          credexID: 'test-credex',
          issuerMemberID: 'issuer-member',
          amount: '100',
          denomination: 'USD',
          acceptorAccountID: 'acceptor-account'
        }
      };

      require('../../../../src/api/Credex/services/AcceptCredex').AcceptCredexService.mockResolvedValue(mockCredexData);

      mockReq.body = {
        credexID: 'test-credex'
      };

      await AcceptCredexController(mockReq, mockRes, mockNext);

      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        type: 'OFFER_ACCEPTED',
        recipientID: 'issuer-member',
        data: expect.objectContaining({
          credexID: 'test-credex',
          amount: '100',
          denomination: 'USD',
          counterpartyName: expect.any(String)
        })
      });
    });
  });

  describe('DeclineCredexController', () => {
    it('should send notification on successful offer decline', async () => {
      const mockCredexData = {
        success: true,
        data: {
          credexID: 'test-credex',
          issuerMemberID: 'issuer-member',
          denomination: 'USD',
          receiverAccountName: 'Test Receiver'
        }
      };

      require('../../../../src/api/Credex/services/DeclineCredex').DeclineCredexService.mockResolvedValue(mockCredexData);

      mockReq.body = {
        credexID: 'test-credex'
      };

      await DeclineCredexController(mockReq, mockRes, mockNext);

      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        type: 'OFFER_DECLINED',
        recipientID: 'issuer-member',
        data: expect.objectContaining({
          credexID: 'test-credex',
          amount: '0',
          denomination: 'USD',
          counterpartyName: expect.any(String)
        })
      });
    });
  });

  afterAll(async () => {
    // Clean up any remaining handles
    jest.clearAllMocks();
    jest.resetModules();
    
    // Allow any pending promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Error Handling', () => {
    it('should not fail request if notification sending fails', async () => {
      // Override CreateCredexService mock for this test
      const CreateCredexService = require('../../../../src/api/Credex/services/CreateCredex').CreateCredexService;
      CreateCredexService.mockImplementationOnce((params: {
        signerID: string;
        issuerAccountID: string;
        receiverAccountID: string;
        InitialAmount: number;
        Denomination: string;
        credexType: string;
        OFFERSorREQUESTS: "OFFERS" | "REQUESTS";
        securedCredex: boolean;
        dueDate?: string;
        requestId: string;
      }) => {
        const amount = params.InitialAmount.toString();
        return Promise.resolve({
          success: true,
          data: {
            credexID: 'test-credex',
            formattedInitialAmount: amount,
            amount: amount,
            counterpartyAccountName: 'Test Receiver',
            secured: params.securedCredex,
            dueDate: params.dueDate,
            transactionType: params.OFFERSorREQUESTS,
            issuerAccountID: params.issuerAccountID,
            issuerAccountName: 'Test Issuer',
            receiverAccountID: params.receiverAccountID,
            receiverMemberID: 'receiver-member',
            issuerMemberID: 'issuer-member',
            createdAt: new Date().toISOString(),
            cxxMultiplier: 1,
            denomination: params.Denomination,
            InitialAmount: amount,
            OutstandingAmount: amount,
            RedeemedAmount: "0",
            DefaultedAmount: "0",
            WrittenOffAmount: "0"
          },
          message: 'Credex created successfully'
        });
      });

      (notificationService.sendNotification as jest.Mock).mockRejectedValue(new Error('Notification error'));

      mockReq.body = {
        issuerAccountID: 'test-account',
        receiverAccountID: 'receiver-account',
        InitialAmount: "100",
        Denomination: 'USD',
        securedCredex: false,
        credexType: 'PURCHASE',
        OFFERSorREQUESTS: 'OFFERS',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
      };

      await CreateCredexController(mockReq, mockRes, mockNext);

      // Request should still succeed even if notification fails
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should skip notification if member ID is not available', async () => {
      // Override CreateCredexService mock for this test
      const CreateCredexService = require('../../../../src/api/Credex/services/CreateCredex').CreateCredexService;
      CreateCredexService.mockImplementationOnce((params: {
        signerID: string;
        issuerAccountID: string;
        receiverAccountID: string;
        InitialAmount: number;
        Denomination: string;
        credexType: string;
        OFFERSorREQUESTS: "OFFERS" | "REQUESTS";
        securedCredex: boolean;
        dueDate?: string;
        requestId: string;
      }) => {
        const amount = params.InitialAmount.toString();
        return Promise.resolve({
          success: true,
          data: {
            credexID: 'test-credex',
            formattedInitialAmount: amount,
            amount: amount,
            counterpartyAccountName: 'Test Receiver',
            secured: params.securedCredex,
            dueDate: params.dueDate,
            transactionType: params.OFFERSorREQUESTS,
            issuerAccountID: params.issuerAccountID,
            issuerAccountName: 'Test Issuer',
            receiverAccountID: params.receiverAccountID,
            receiverMemberID: null, // No member ID
            issuerMemberID: 'issuer-member',
            createdAt: new Date().toISOString(),
            cxxMultiplier: 1,
            denomination: params.Denomination,
            InitialAmount: amount,
            OutstandingAmount: amount,
            RedeemedAmount: "0",
            DefaultedAmount: "0",
            WrittenOffAmount: "0"
          },
          message: 'Credex created successfully'
        });
      });


      mockReq.body = {
        signerID: 'test-member',
        issuerAccountID: 'test-account',
        receiverAccountID: 'receiver-account',
        InitialAmount: "100",
        Denomination: 'USD',
        securedCredex: false,
        credexType: 'PURCHASE',
        OFFERSorREQUESTS: 'OFFERS',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
      };

      await CreateCredexController(mockReq, mockRes, mockNext);

      expect(notificationService.sendNotification).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
