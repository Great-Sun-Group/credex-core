import express from "express";
import { apiVersionOneRoute } from "../../index";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForAccountController } from "./controllers/authorizeForAccount";
import { UnauthorizeForAccountController } from "./controllers/unauthorizeForAccount";
import { UpdateSendOffersToController } from "./controllers/updateSendOffersTo";
import { validateRequest } from "../../../middleware/validateRequest";
import { rateLimiter } from "../../../middleware/rateLimiter";
import { accountSchemas } from "./validators/accountSchemas";
import { errorHandler } from "../../../middleware/errorHandler";

export default function AccountRoutes(
  app: express.Application,
  jsonParser: express.RequestHandler
) {
  /**
   * @swagger
   * /api/v1/createAccount:
   *   post:
   *     summary: Create a new account
   *     tags: [Accounts]
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
   *       429:
   *         description: Too many requests
   */
  app.post(
    `${apiVersionOneRoute}createAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(accountSchemas.createAccount),
    CreateAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/v1/getAccountByHandle:
   *   get:
   *     summary: Get account by handle
   *     tags: [Accounts]
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
   *       404:
   *         description: Account not found
   *       429:
   *         description: Too many requests
   */
  app.get(
    `${apiVersionOneRoute}getAccountByHandle`,
    rateLimiter,
    validateRequest(accountSchemas.getAccountByHandle),
    GetAccountByHandleController,
    errorHandler
  );

  /**
   * @swagger
   * /api/v1/updateAccount:
   *   patch:
   *     summary: Update account information
   *     tags: [Accounts]
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
   *       404:
   *         description: Account not found
   *       429:
   *         description: Too many requests
   */
  app.patch(
    `${apiVersionOneRoute}updateAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(accountSchemas.updateAccount),
    UpdateAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/v1/authorizeForAccount:
   *   post:
   *     summary: Authorize a member for an account
   *     tags: [Accounts]
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
   *       429:
   *         description: Too many requests
   */
  app.post(
    `${apiVersionOneRoute}authorizeForAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(accountSchemas.authorizeForAccount),
    AuthorizeForAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/v1/unauthorizeForAccount:
   *   post:
   *     summary: Unauthorize a member for an account
   *     tags: [Accounts]
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
   *       429:
   *         description: Too many requests
   */
  app.post(
    `${apiVersionOneRoute}unauthorizeForAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(accountSchemas.unauthorizeForAccount),
    UnauthorizeForAccountController,
    errorHandler
  );

  /**
   * @swagger
   * /api/v1/updateSendOffersTo:
   *   post:
   *     summary: Update the member to receive offers for an account
   *     tags: [Accounts]
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
   *       429:
   *         description: Too many requests
   */
  app.post(
    `${apiVersionOneRoute}updateSendOffersTo`,
    rateLimiter,
    jsonParser,
    validateRequest(accountSchemas.updateSendOffersTo),
    UpdateSendOffersToController,
    errorHandler
  );
}
