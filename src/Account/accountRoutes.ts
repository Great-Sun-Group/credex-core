import express from "express";
import { apiVersionOneRoute } from "..";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForAccountController } from "./controllers/authorizeForAccount";
import { UnauthorizeForAccountController } from "./controllers/unauthorizeForAccount";
import { UpdateSendOffersToController } from "./controllers/updateSendOffersTo";

export default function AccountRoutes(
  app: express.Application,
  jsonParser: any
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
   *               accountType:
   *                 type: string
   *               accountName:
   *                 type: string
   *               accountHandle:
   *                 type: string
   *               defaultDenom:
   *                 type: string
   *     responses:
   *       200:
   *         description: Account created successfully
   *       400:
   *         description: Bad request
   */
  app.post(
    `${apiVersionOneRoute}createAccount`,
    jsonParser,
    CreateAccountController
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
   */
  app.get(
    `${apiVersionOneRoute}getAccountByHandle`,
    jsonParser,
    GetAccountByHandleController
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
   *             type: object
   *             required:
   *               - ownerID
   *               - accountID
   *             properties:
   *               ownerID:
   *                 type: string
   *               accountID:
   *                 type: string
   *               accountName:
   *                 type: string
   *               accountHandle:
   *                 type: string
   *               defaultDenom:
   *                 type: string
   *     responses:
   *       200:
   *         description: Account updated successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Account not found
   */
  app.patch(
    `${apiVersionOneRoute}updateAccount`,
    jsonParser,
    UpdateAccountController
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
   *             type: object
   *             required:
   *               - memberHandleToBeAuthorized
   *               - accountID
   *               - ownerID
   *             properties:
   *               memberHandleToBeAuthorized:
   *                 type: string
   *               accountID:
   *                 type: string
   *               ownerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Member authorized successfully
   *       400:
   *         description: Bad request
   */
  app.post(
    `${apiVersionOneRoute}authorizeForAccount`,
    jsonParser,
    AuthorizeForAccountController
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
   *             type: object
   *             required:
   *               - memberIDtoBeUnauthorized
   *               - accountID
   *               - ownerID
   *             properties:
   *               memberIDtoBeUnauthorized:
   *                 type: string
   *               accountID:
   *                 type: string
   *               ownerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Member unauthorized successfully
   *       400:
   *         description: Bad request
   */
  app.post(
    `${apiVersionOneRoute}unauthorizeForAccount`,
    jsonParser,
    UnauthorizeForAccountController
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
   *             type: object
   *             required:
   *               - memberIDtoSendOffers
   *               - accountID
   *               - ownerID
   *             properties:
   *               memberIDtoSendOffers:
   *                 type: string
   *               accountID:
   *                 type: string
   *               ownerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Send offers recipient updated successfully
   *       400:
   *         description: Bad request
   */
  app.post(
    `${apiVersionOneRoute}updateSendOffersTo`,
    jsonParser,
    UpdateSendOffersToController
  );
}
