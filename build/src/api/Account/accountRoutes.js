"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccountRoutes;
const index_1 = require("../../index");
const createAccount_1 = require("./controllers/createAccount");
const getAccountByHandle_1 = require("./controllers/getAccountByHandle");
const updateAccount_1 = require("./controllers/updateAccount");
const authorizeForAccount_1 = require("./controllers/authorizeForAccount");
const unauthorizeForAccount_1 = require("./controllers/unauthorizeForAccount");
const updateSendOffersTo_1 = require("./controllers/updateSendOffersTo");
function AccountRoutes(app, jsonParser) {
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
    app.post(`${index_1.apiVersionOneRoute}createAccount`, jsonParser, createAccount_1.CreateAccountController);
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
    app.get(`${index_1.apiVersionOneRoute}getAccountByHandle`, jsonParser, getAccountByHandle_1.GetAccountByHandleController);
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
    app.patch(`${index_1.apiVersionOneRoute}updateAccount`, jsonParser, updateAccount_1.UpdateAccountController);
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
    app.post(`${index_1.apiVersionOneRoute}authorizeForAccount`, jsonParser, authorizeForAccount_1.AuthorizeForAccountController);
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
    app.post(`${index_1.apiVersionOneRoute}unauthorizeForAccount`, jsonParser, unauthorizeForAccount_1.UnauthorizeForAccountController);
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
    app.post(`${index_1.apiVersionOneRoute}updateSendOffersTo`, jsonParser, updateSendOffersTo_1.UpdateSendOffersToController);
}
//# sourceMappingURL=accountRoutes.js.map