import express from "express";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForAccountController } from "./controllers/authorizeForAccount";
import { UnauthorizeForAccountController } from "./controllers/unauthorizeForAccount";
import { UpdateSendOffersToController } from "./controllers/updateSendOffersTo";
import { rateLimiter } from "../../middleware/rateLimiter";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createAccountSchema,
  getAccountByHandleSchema,
  updateAccountSchema,
  authorizeForAccountSchema,
  unauthorizeForAccountSchema,
  updateSendOffersToSchema,
} from "./accountValidationSchemas";
import logger from "../../utils/logger";

export default function AccountRoutes(jsonParser: express.RequestHandler) {
  const router = express.Router();
  logger.info("Initializing Account routes");

  /**
   * @swagger
   * /api/v1/createAccount:
   *   post:
   *     summary: Create a new account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAccountRequest'
   *     responses:
   *       200:
   *         description: Account created successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       429:
   *         description: Too many requests
   */
  router.post(
    `/createAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(createAccountSchema),
    CreateAccountController,
    errorHandler
  );
  logger.debug("Registered route: POST /api/v1/createAccount");

  /**
   * @swagger
   * /api/v1/getAccountByHandle:
   *   get:
   *     summary: Get account by handle
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: accountHandle
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Account retrieved successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Account not found
   *       429:
   *         description: Too many requests
   */
  router.get(
    `/getAccountByHandle`,
    rateLimiter,
    validateRequest(getAccountByHandleSchema, "query"),
    GetAccountByHandleController,
    errorHandler
  );
  logger.debug("Registered route: GET /api/v1/getAccountByHandle");

  /**
   * @swagger
   * /api/v1/updateAccount:
   *   patch:
   *     summary: Update account information
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateAccountRequest'
   *     responses:
   *       200:
   *         description: Account updated successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Account not found
   *       429:
   *         description: Too many requests
   */
  router.patch(
    `/updateAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(updateAccountSchema),
    UpdateAccountController,
    errorHandler
  );
  logger.debug("Registered route: PATCH /api/v1/updateAccount");

  /**
   * @swagger
   * /api/v1/authorizeForAccount:
   *   post:
   *     summary: Authorize a member for an account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AuthorizeForAccountRequest'
   *     responses:
   *       200:
   *         description: Member authorized successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       429:
   *         description: Too many requests
   */
  router.post(
    `/authorizeForAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(authorizeForAccountSchema),
    AuthorizeForAccountController,
    errorHandler
  );
  logger.debug("Registered route: POST /api/v1/authorizeForAccount");

  /**
   * @swagger
   * /api/v1/unauthorizeForAccount:
   *   post:
   *     summary: Unauthorize a member for an account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UnauthorizeForAccountRequest'
   *     responses:
   *       200:
   *         description: Member unauthorized successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       429:
   *         description: Too many requests
   */
  router.post(
    `/unauthorizeForAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(unauthorizeForAccountSchema),
    UnauthorizeForAccountController,
    errorHandler
  );
  logger.debug("Registered route: POST /api/v1/unauthorizeForAccount");

  /**
   * @swagger
   * /api/v1/updateSendOffersTo:
   *   post:
   *     summary: Update the member to receive offers for an account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateSendOffersToRequest'
   *     responses:
   *       200:
   *         description: Send offers recipient updated successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       429:
   *         description: Too many requests
   */
  router.post(
    `/updateSendOffersTo`,
    rateLimiter,
    jsonParser,
    validateRequest(updateSendOffersToSchema),
    UpdateSendOffersToController,
    errorHandler
  );
  logger.debug("Registered route: POST /api/v1/updateSendOffersTo");

  logger.info("Account routes initialized successfully");
  return router;
}
