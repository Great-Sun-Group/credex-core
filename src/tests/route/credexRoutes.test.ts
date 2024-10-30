import express from 'express';
import request from 'supertest';
import {  OfferCredexController} from '../../api/Credex/controllers/offerCredex';
import { AcceptCredexController } from '../../api/Credex/controllers/acceptCredex';
import { DeclineCredexController } from '../../api/Credex/controllers/declineCredex';
import { CancelCredexController } from '../../api/Credex/controllers/cancelCredex';
import { GetCredexController } from '../../api/Credex/controllers/getCredex';
import { GetLedgerController } from '../../api/Credex/controllers/getLedger';
import CredexRoutes from '../../api/Credex/credexRoutes';

jest.mock('../../api/Credex/controllers/offerCredex');
jest.mock('../../api/Credex/controllers/acceptCredex');
jest.mock('../../api/Credex/controllers/declineCredex');
jest.mock('../../api/Credex/controllers/cancelCredex');
jest.mock('../../api/Credex/controllers/getCredex');
jest.mock('../../api/Credex/controllers/getLedger');

describe('Credex Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    CredexRoutes(app);

    // Alternatively, if CredexRoutes returns a router:
    // app.use('/api/v1', CredexRoutes());

    // If you need to mock apiVersionOneRoute, you can set it here
    // const apiVersionOneRoute = '/api/v1';
    // app.use(apiVersionOneRoute, CredexRoutes(app));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle POST /credex/offerCredex', async () => {
    const mockOfferCredexController = OfferCredexController as jest.MockedFunction<typeof OfferCredexController>;
    mockOfferCredexController.mockImplementation(async (req, res) => {
      return res.status(200).json({ message: 'Credex offered successfully' });
    });

    const response = await request(app)
      .post('/api/v1/credex/offerCredex')
      .send({
        memberID: 'test-member-id',
        issuerAccountID: 'test-issuer-id',
        receiverAccountID: 'test-receiver-id',
        Denomination: 'USD',
        InitialAmount: 100,
        credexType: 'PURCHASE',
        securedCredex: false,
        dueDate: '2023-12-31'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Credex offered successfully' });
    expect(mockOfferCredexController).toHaveBeenCalled();
  });

  it('should handle PUT /credex/acceptCredex', async () => {
    const mockAcceptCredexController = AcceptCredexController as jest.MockedFunction<typeof AcceptCredexController>;
    mockAcceptCredexController.mockImplementation(async (req, res) => {
      res.status(200).json({ message: 'Credex accepted successfully' });
      return Promise.resolve();
    });

    const response = await request(app)
      .put('/api/v1/credex/acceptCredex')
      .send({
        credexID: 'test-credex-id',
        signerID: 'test-signer-id'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Credex accepted successfully' });
    expect(mockAcceptCredexController).toHaveBeenCalled();
  });

  it('should handle PUT /credex/declineCredex', async () => {
    const mockDeclineCredexController = DeclineCredexController as jest.MockedFunction<typeof DeclineCredexController>;
    mockDeclineCredexController.mockImplementation(async (req, res) => {
      res.status(200).json({ message: 'Credex declined successfully' });
      return Promise.resolve();
    });

    const response = await request(app)
      .put('/api/v1/credex/declineCredex')
      .send({
        credexID: 'test-credex-id'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Credex declined successfully' });
    expect(mockDeclineCredexController).toHaveBeenCalled();
  });

  it('should handle PUT /credex/cancelCredex', async () => {
    const mockCancelCredexController = CancelCredexController as jest.MockedFunction<typeof CancelCredexController>;
    mockCancelCredexController.mockImplementation(async (req, res) => {
      res.status(200).json({ message: 'Credex cancelled successfully' });
      return Promise.resolve();
    });

    const response = await request(app)
      .put('/api/v1/credex/cancelCredex')
      .send({
        credexID: 'test-credex-id'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Credex cancelled successfully' });
    expect(mockCancelCredexController).toHaveBeenCalled();
  });

  it('should handle GET /credex/getCredex', async () => {
    const mockGetCredexController = GetCredexController as jest.MockedFunction<typeof GetCredexController>;
    mockGetCredexController.mockImplementation(async (req, res) => {
      res.status(200).json({ credex: { id: 'test-credex-id', amount: 100 } });
      return Promise.resolve();
    });

    const response = await request(app)
      .get('/api/v1/credex/getCredex')
      .query({ credexID: 'test-credex-id' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ credex: { id: 'test-credex-id', amount: 100 } });
    expect(mockGetCredexController).toHaveBeenCalled();
  });

  it('should handle GET /credex/getLedger', async () => {
    const mockGetLedgerController = GetLedgerController as jest.MockedFunction<typeof GetLedgerController>;
    mockGetLedgerController.mockImplementation(async (req, res) => {
      res.status(200).json({ ledger: [{ id: 'test-credex-id', amount: 100 }] });
      return Promise.resolve();
    });

    const response = await request(app)
      .get('/api/v1/credex/getLedger')
      .query({ accountID: 'test-account-id' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ledger: [{ id: 'test-credex-id', amount: 100 }] });
    expect(mockGetLedgerController).toHaveBeenCalled();
  });
});
