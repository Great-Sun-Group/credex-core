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
const rateLimiter_1 = require("../../../middleware/rateLimiter");
const errorHandler_1 = require("../../../middleware/errorHandler");
const validateRequest_1 = require("../../../middleware/validateRequest");
const accountValidationSchemas_1 = require("./accountValidationSchemas");
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
     *             $ref: '#/components/schemas/CreateAccountRequest'
     *     responses:
     *       200:
     *         description: Account created successfully
     *       400:
     *         description: Bad request
     *       429:
     *         description: Too many requests
     */
    app.post(`${index_1.apiVersionOneRoute}createAccount`, rateLimiter_1.rateLimiter, jsonParser, (0, validateRequest_1.validateRequest)(accountValidationSchemas_1.createAccountSchema), createAccount_1.CreateAccountController, errorHandler_1.errorHandler);
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
    app.get(`${index_1.apiVersionOneRoute}getAccountByHandle`, rateLimiter_1.rateLimiter, (0, validateRequest_1.validateRequest)(accountValidationSchemas_1.getAccountByHandleSchema, 'query'), getAccountByHandle_1.GetAccountByHandleController, errorHandler_1.errorHandler);
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
    app.patch(`${index_1.apiVersionOneRoute}updateAccount`, rateLimiter_1.rateLimiter, jsonParser, (0, validateRequest_1.validateRequest)(accountValidationSchemas_1.updateAccountSchema), updateAccount_1.UpdateAccountController, errorHandler_1.errorHandler);
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
    app.post(`${index_1.apiVersionOneRoute}authorizeForAccount`, rateLimiter_1.rateLimiter, jsonParser, (0, validateRequest_1.validateRequest)(accountValidationSchemas_1.authorizeForAccountSchema), authorizeForAccount_1.AuthorizeForAccountController, errorHandler_1.errorHandler);
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
    app.post(`${index_1.apiVersionOneRoute}unauthorizeForAccount`, rateLimiter_1.rateLimiter, jsonParser, (0, validateRequest_1.validateRequest)(accountValidationSchemas_1.unauthorizeForAccountSchema), unauthorizeForAccount_1.UnauthorizeForAccountController, errorHandler_1.errorHandler);
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
    app.post(`${index_1.apiVersionOneRoute}updateSendOffersTo`, rateLimiter_1.rateLimiter, jsonParser, (0, validateRequest_1.validateRequest)(accountValidationSchemas_1.updateSendOffersToSchema), updateSendOffersTo_1.UpdateSendOffersToController, errorHandler_1.errorHandler);
}
//# sourceMappingURL=accountRoutes.js.map