import { MockCredexNotificationService } from '../../../../src/api/Notifications/testing/MockCredexNotificationService';

// Mock all dependencies
jest.mock('../../../../src/utils/logger', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock the CredexNotificationService
jest.mock('../../../../src/api/Notifications/services/CredexNotificationService', () => {
  const mockService = new MockCredexNotificationService();
  return {
    CredexNotificationService: {
      getInstance: jest.fn().mockResolvedValue(mockService)
    }
  };
});

// Import controllers after mocks
import { CreateCredexController } from '../../../../src/api/Credex/controllers/createCredex';
import { AcceptCredexController } from '../../../../src/api/Credex/controllers/acceptCredex';
import { DeclineCredexController } from '../../../../src/api/Credex/controllers/declineCredex';
import { CancelCredexController } from '../../../../src/api/Credex/controllers/cancelCredex';

// Mock CreateCredexService
jest.mock('../../../../src/api/Credex/services/CreateCredex', () => ({
  CreateCredexService: jest.fn().mockImplementation((params: any) => 
    Promise.resolve({
      success: true,
      data: {
        credexID: 'test-credex',
        receiverMemberID: 'receiver-member',
        issuerAccountName: 'Test Issuer',
        counterpartyAccountName: 'Test Receiver',
        receiverAccountID: 'receiver-account',
        denomination: params.Denomination,
        amount: params.InitialAmount
      }
    })
  )
}));

// Mock AcceptCredexService
jest.mock('../../../../src/api/Credex/services/AcceptCredex', () => ({
  AcceptCredexService: jest.fn()
}));

// Mock DeclineCredexService
jest.mock('../../../../src/api/Credex/services/DeclineCredex', () => ({
  DeclineCredexService: jest.fn()
}));

// Mock CancelCredexService
jest.mock('../../../../src/api/Credex/services/CancelCredex', () => ({
  CancelCredexService: jest.fn()
}));

// Mock other required services
jest.mock('../../../../src/api/Member/services/AuthForTierSpendLimit', () => ({
  AuthForTierSpendLimitService: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../../../src/utils/dashboardUtils', () => ({
  getDashboardData: jest.fn().mockResolvedValue({
    member: {},
    account: {}
  })
}));

jest.mock('../../../../src/core-cron/constants/credspan', () => ({
  checkDueDate: jest.fn().mockResolvedValue(true),
  credspan: 7 * 24 * 60 * 60 * 1000
}));

describe('Credex Controller Notifications', () => {
  let mockNotificationService: MockCredexNotificationService;

  beforeAll(() => {
    jest.clearAllMocks();
  });

  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationService = new MockCredexNotificationService();

    // Re-mock CredexNotificationService getInstance to use our new instance
    const { CredexNotificationService } = require('../../../../src/api/Notifications/services/CredexNotificationService');
    CredexNotificationService.getInstance.mockResolvedValue(mockNotificationService);

    mockReq = {
      id: 'test-request-id',
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
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      await CreateCredexController(mockReq, mockRes, mockNext);

      const notifications = mockNotificationService.getCreatedNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        type: 'OFFER_CREATED',
        receiverMemberID: 'receiver-member',
        credexID: 'test-credex',
        amount: '100.00',
        denomination: 'USD',
        counterpartyName: 'Test Issuer',
        requestId: 'test-request-id'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle notification failure gracefully', async () => {
      mockNotificationService.setFailNextNotification(true);

      mockReq.body = {
        issuerAccountID: 'test-account',
        receiverAccountID: 'receiver-account',
        InitialAmount: "100",
        Denomination: 'USD',
        securedCredex: false,
        credexType: 'PURCHASE',
        OFFERSorREQUESTS: 'OFFERS',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      await CreateCredexController(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should skip notification if member ID is not available', async () => {
      const { CreateCredexService } = require('../../../../src/api/Credex/services/CreateCredex');
      CreateCredexService.mockImplementationOnce(() => 
        Promise.resolve({
          success: true,
          data: {
            credexID: 'test-credex',
            receiverMemberID: null,
            issuerAccountName: 'Test Issuer',
            counterpartyAccountName: 'Test Receiver',
            receiverAccountID: 'receiver-account',
            denomination: 'USD',
            amount: '100'
          }
        })
      );

      mockReq.body = {
        issuerAccountID: 'test-account',
        receiverAccountID: 'receiver-account',
        InitialAmount: "100",
        Denomination: 'USD',
        securedCredex: false,
        credexType: 'PURCHASE',
        OFFERSorREQUESTS: 'OFFERS',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      await CreateCredexController(mockReq, mockRes, mockNext);

      expect(mockNotificationService.getCreatedNotifications()).toHaveLength(0);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('AcceptCredexController', () => {
    beforeEach(() => {
      const { AcceptCredexService } = require('../../../../src/api/Credex/services/AcceptCredex');
      AcceptCredexService.mockResolvedValue({
        success: true,
        data: {
          credexID: 'test-credex',
          issuerMemberID: 'issuer-member',
          amount: '100',
          denomination: 'USD',
          acceptorAccountID: 'acceptor-account'
        }
      });
    });

    it('should send notification on successful offer acceptance', async () => {
      mockReq.body = {
        credexID: 'test-credex'
      };

      await AcceptCredexController(mockReq, mockRes, mockNext);

      const notifications = mockNotificationService.getAcceptedNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        type: 'OFFER_ACCEPTED',
        issuerMemberID: 'issuer-member',
        credexID: 'test-credex',
        amount: '100.00',
        denomination: 'USD',
        counterpartyName: 'acceptor-account',
        requestId: 'test-request-id'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle notification failure gracefully', async () => {
      mockNotificationService.setFailNextNotification(true);

      mockReq.body = {
        credexID: 'test-credex'
      };

      await AcceptCredexController(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should skip notification if issuer member ID is not available', async () => {
      const { AcceptCredexService } = require('../../../../src/api/Credex/services/AcceptCredex');
      AcceptCredexService.mockResolvedValueOnce({
        success: true,
        data: {
          credexID: 'test-credex',
          issuerMemberID: null,
          amount: '100',
          denomination: 'USD',
          acceptorAccountID: 'acceptor-account'
        }
      });

      mockReq.body = {
        credexID: 'test-credex'
      };

      await AcceptCredexController(mockReq, mockRes, mockNext);

      expect(mockNotificationService.getAcceptedNotifications()).toHaveLength(0);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('DeclineCredexController', () => {
    beforeEach(() => {
      const { DeclineCredexService } = require('../../../../src/api/Credex/services/DeclineCredex');
      DeclineCredexService.mockResolvedValue({
        success: true,
        data: {
          credexID: 'test-credex',
          issuerMemberID: 'issuer-member',
          denomination: 'USD',
          receiverAccountName: 'Test Receiver'
        }
      });
    });

    it('should send notification on successful offer decline', async () => {
      mockReq.body = {
        credexID: 'test-credex'
      };

      await DeclineCredexController(mockReq, mockRes, mockNext);

      const notifications = mockNotificationService.getDeclinedNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        type: 'OFFER_DECLINED',
        issuerMemberID: 'issuer-member',
        credexID: 'test-credex',
        amount: '0',
        denomination: 'USD',
        counterpartyName: 'Test Receiver',
        requestId: 'test-request-id'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle notification failure gracefully', async () => {
      mockNotificationService.setFailNextNotification(true);

      mockReq.body = {
        credexID: 'test-credex'
      };

      await DeclineCredexController(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should skip notification if issuer member ID is not available', async () => {
      const { DeclineCredexService } = require('../../../../src/api/Credex/services/DeclineCredex');
      DeclineCredexService.mockResolvedValueOnce({
        success: true,
        data: {
          credexID: 'test-credex',
          issuerMemberID: null,
          denomination: 'USD',
          receiverAccountName: 'Test Receiver'
        }
      });

      mockReq.body = {
        credexID: 'test-credex'
      };

      await DeclineCredexController(mockReq, mockRes, mockNext);

      expect(mockNotificationService.getDeclinedNotifications()).toHaveLength(0);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('CancelCredexController', () => {
    beforeEach(() => {
      const { CancelCredexService } = require('../../../../src/api/Credex/services/CancelCredex');
      CancelCredexService.mockResolvedValue({
        success: true,
        data: {
          credexID: 'test-credex',
          receiverMemberID: 'receiver-member',
          initialAmount: 100,
          cxxMultiplier: 1,
          denomination: 'USD',
          issuerAccountName: 'Test Issuer',
          receiverAccountID: 'receiver-account'
        }
      });
    });

    it('should send notification on successful offer cancellation', async () => {
      mockReq.body = {
        credexID: 'test-credex'
      };

      await CancelCredexController(mockReq, mockRes, mockNext);

      const notifications = mockNotificationService.getCancelledNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        type: 'OFFER_CANCELLED',
        receiverMemberID: 'receiver-member',
        credexID: 'test-credex',
        amount: '100.00',
        denomination: 'USD',
        counterpartyName: 'Test Issuer',
        requestId: 'test-request-id'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle notification failure gracefully', async () => {
      mockNotificationService.setFailNextNotification(true);

      mockReq.body = {
        credexID: 'test-credex'
      };

      await CancelCredexController(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should skip notification if receiver member ID is not available', async () => {
      const { CancelCredexService } = require('../../../../src/api/Credex/services/CancelCredex');
      CancelCredexService.mockResolvedValueOnce({
        success: true,
        data: {
          credexID: 'test-credex',
          receiverMemberID: null,
          initialAmount: 100,
          cxxMultiplier: 1,
          denomination: 'USD',
          issuerAccountName: 'Test Issuer',
          receiverAccountID: 'receiver-account'
        }
      });

      mockReq.body = {
        credexID: 'test-credex'
      };

      await CancelCredexController(mockReq, mockRes, mockNext);

      expect(mockNotificationService.getCancelledNotifications()).toHaveLength(0);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });
});
