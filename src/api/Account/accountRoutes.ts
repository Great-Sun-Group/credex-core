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
   * /api/account/getBalances:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account balances
   *     description: Retrieve secured and unsecured balances for an account
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
   *                 description: ID of the account to get balances for
   *     responses:
   *       200:
   *         description: Balances retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     securedNetBalancesByDenom:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ["100.00 USD", "50.00 CAD"]
   *                     unsecuredBalancesInDefaultDenom:
   *                       type: object
   *                       properties:
   *                         totalPayables:
   *                           type: string
   *                           example: "200.00 USD"
   *                         totalReceivables:
   *                           type: string
   *                           example: "300.00 USD"
   *                         netPayRec:
   *                           type: string
   *                           example: "100.00 USD"
   *                     netCredexAssetsInDefaultDenom:
   *                       type: string
   *                       example: "150.00 USD"
   *                 message:
   *                   type: string
   *                   example: "Account balances retrieved successfully"
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Account not found
   */
  router.post(
    `/getBalances`,
    validateRequest(getBalancesSchema),
    GetBalancesController,
    errorHandler
  );
  logger.debug("Route registered: POST /getBalances");

  /**
   * @swagger
   * /api/account/createAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Create a new account
   *     description: Create a new account with optional DCO participation settings
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
   *                 description: ID of the account owner
   *               accountType:
   *                 type: string
   *                 description: Type of account
   *                 enum: [PERSONAL_CONSUMPTION, BUSINESS]
   *               accountName:
   *                 type: string
   *                 description: Name of the account
   *               accountHandle:
   *                 type: string
   *                 description: Unique handle for the account
   *               defaultDenom:
   *                 type: string
   *                 description: Default denomination for the account
   *               DCOgiveInCXX:
   *                 type: number
   *                 description: DCO give rate in CXX (optional)
   *               DCOdenom:
   *                 type: string
   *                 description: DCO denomination (optional)
   *     responses:
   *       200:
   *         description: Account created successfully
   *       400:
   *         description: Invalid input data
   */
  router.post(
    `/createAccount`,
    validateRequest(createAccountSchema),
    CreateAccountController,
    errorHandler
  );
  logger.info("Create Account route registered");

  /**
   * @swagger
   * /api/account/getAccountByHandle:
   *   post:
   *     tags: [Accounts]
   *     summary: Get account by handle
   *     description: Retrieve account information using its handle
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
   *                 description: Account's unique handle
   *     responses:
   *       200:
   *         description: Account information retrieved successfully
   *       404:
   *         description: Account not found
   */
  router.post(
    `/getAccountByHandle`,
    validateRequest(getAccountByHandleSchema),
    GetAccountByHandleController,
    errorHandler
  );
  logger.debug("Route registered: POST /getAccountByHandle");

  /**
   * @swagger
   * /api/account/updateAccount:
   *   post:
   *     tags: [Accounts]
   *     summary: Update account details
   *     description: Update account information including optional DCO settings
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
   *                 description: ID of the account owner
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to update
   *               accountName:
   *                 type: string
   *                 description: New account name (optional)
   *               accountHandle:
   *                 type: string
   *                 description: New account handle (optional)
   *               defaultDenom:
   *                 type: string
   *                 description: New default denomination (optional)
   *               DCOgiveInCXX:
   *                 type: number
   *                 description: New DCO give rate in CXX (optional)
   *               DCOdenom:
   *                 type: string
   *                 description: New DCO denomination (optional)
   *     responses:
   *       200:
   *         description: Account updated successfully
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Account not found
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
   *     description: Grant account access authorization to a member
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
   *                 description: ID of the account
   *               memberHandleToBeAuthorized:
   *                 type: string
   *                 description: Handle of the member to authorize
   *               ownerID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account owner
   *     responses:
   *       200:
   *         description: Authorization granted successfully
   *       400:
   *         description: Invalid input data
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
   *     description: Remove account access authorization from a member
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
   *                 description: ID of the account
   *               memberID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member to unauthorize
   *     responses:
   *       200:
   *         description: Authorization removed successfully
   *       400:
   *         description: Invalid input data
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
   *     description: Update settings for sending offers to a member
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
   *                 description: ID of the account
   *               memberID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member
   *     responses:
   *       200:
   *         description: Send offers settings updated successfully
   *       400:
   *         description: Invalid input data
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
   *     description: Retrieve the ledger for a specific account
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
   *                 description: ID of the account
   *     responses:
   *       200:
   *         description: Ledger retrieved successfully
   *       404:
   *         description: Account not found
   */
  router.post(
    `/getLedger`,
    validateRequest(getLedgerSchema),
    GetLedgerController,
    errorHandler
  );
  logger.debug("Route registered: POST /getLedger");

  /**
   * @swagger
   * /api/account/setDCOparticipantRate:
   *   post:
   *     tags: [Accounts]
   *     summary: Set DCO participant rate
   *     description: Set or update the DCO participation rate for an account
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
   *                 description: ID of the account
   *               DCOgiveInCXX:
   *                 type: number
   *                 description: DCO give rate in CXX
   *                 example: 1
   *               DCOdenom:
   *                 type: string
   *                 description: DCO denomination
   *                 example: "CAD"
   *     responses:
   *       200:
   *         description: DCO participant rate set successfully
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Account not found
   */
  router.post(
    `/setDCOparticipantRate`,
    validateRequest(setDCOparticipantRateSchema),
    SetDCOparticipantRateController,
    errorHandler
  );
  logger.debug("Route registered: POST /setDCOparticipantRate");

  logger.info("Account routes initialized successfully");
  return router;
}
