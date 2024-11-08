import express from "express";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForAccountController } from "./controllers/authorizeForAccount";
import { UnauthorizeForAccountController } from "./controllers/unauthorizeForAccount";
import { UpdateSendOffersToController } from "./controllers/updateSendOffersTo";
import { GetLedgerController } from "./controllers/getLedger";
import { SetDCOparticipantRateController } from "./controllers/setDCOparticipantRate";
import { GetBalancesController } from "./controllers/getBalances";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createAccountSchema,
  getAccountByHandleSchema,
  updateAccountSchema,
  authorizeForAccountSchema,
  unauthorizeForAccountSchema,
  updateSendOffersToSchema,
  getLedgerSchema,
  setDCOparticipantRateSchema,
  getBalancesSchema,
} from "./accountValidationSchemas";
import logger from "../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Account management operations
 */

export default function AccountRoutes() {
  const router = express.Router();
  logger.info("Initializing Account routes");

  /**
   * @swagger
   * /api/account/createAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Create a new account
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ownerID
   *               - accountType
   *               - accountName
   *               - accountHandle
   *               - defaultDenom
   *             properties:
   *               ownerID:
   *                 type: string
   *                 format: uuid
   *               accountType:
   *                 type: string
   *                 enum: [PERSONAL_CONSUMPTION, BUSINESS, CREDEX_FOUNDATION, TRUST, OPERATIONS]
   *               accountName:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *               defaultDenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *               DCOgiveInCXX:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *               DCOdenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   */
  router.post(
    `/createAccount`,
    validateRequest(createAccountSchema),
    CreateAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/getAccountByHandle:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account by handle
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountHandle
   *             properties:
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   */
  router.post(
    `/getAccountByHandle`,
    validateRequest(getAccountByHandleSchema),
    GetAccountByHandleController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/updateAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Update account details
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ownerID
   *               - accountID
   *             properties:
   *               ownerID:
   *                 type: string
   *                 format: uuid
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               accountName:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *               defaultDenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *               DCOgiveInCXX:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *               DCOdenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   */
  router.post(
    `/updateAccount`,
    validateRequest(updateAccountSchema),
    UpdateAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/authorizeForAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Authorize member for account
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *               - memberHandleToBeAuthorized
   *               - ownerID
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               memberHandleToBeAuthorized:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *               ownerID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/authorizeForAccount`,
    validateRequest(authorizeForAccountSchema),
    AuthorizeForAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/unauthorizeForAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Remove member authorization
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *               - memberID
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               memberID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/unauthorizeForAccount`,
    validateRequest(unauthorizeForAccountSchema),
    UnauthorizeForAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/updateSendOffersTo:
   *   post:
   *     tags: [Accounts]
   *     summary: Update send offers settings
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *               - memberID
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               memberID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/updateSendOffersTo`,
    validateRequest(updateSendOffersToSchema),
    UpdateSendOffersToController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/getLedger:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account ledger
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/getLedger`,
    validateRequest(getLedgerSchema),
    GetLedgerController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/setDCOparticipantRate:
   *   post:
   *     tags: [Accounts]
   *     summary: Set DCO participant rate
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *               - DCOgiveInCXX
   *               - DCOdenom
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               DCOgiveInCXX:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *               DCOdenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   */
  router.post(
    `/setDCOparticipantRate`,
    validateRequest(setDCOparticipantRateSchema),
    SetDCOparticipantRateController,
    errorHandler
  );

  /**
   * @swagger
   * /api/account/getBalances:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account balances
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/getBalances`,
    validateRequest(getBalancesSchema),
    GetBalancesController,
    errorHandler
  );

  logger.info("Account routes initialized successfully");
  return router;
}
