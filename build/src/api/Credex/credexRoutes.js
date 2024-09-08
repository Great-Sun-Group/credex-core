"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CredexRoutes;
const index_1 = require("../../index");
const offerCredex_1 = require("./controllers/offerCredex");
const acceptCredex_1 = require("./controllers/acceptCredex");
const acceptCredexBulk_1 = require("./controllers/acceptCredexBulk");
const declineCredex_1 = require("./controllers/declineCredex");
const cancelCredex_1 = require("./controllers/cancelCredex");
const getCredex_1 = require("./controllers/getCredex");
const getLedger_1 = require("./controllers/getLedger");
const validateRequest_1 = require("../../../middleware/validateRequest");
const credexValidationSchemas_1 = require("./credexValidationSchemas");
function CredexRoutes(app, jsonParser) {
    /**
     * @swagger
     * /api/v1/offerCredex:
     *   post:
     *     summary: Offer a new Credex
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - memberID
     *               - issuerAccountID
     *               - receiverAccountID
     *               - Denomination
     *               - InitialAmount
     *             properties:
     *               memberID:
     *                 type: string
     *               issuerAccountID:
     *                 type: string
     *               receiverAccountID:
     *                 type: string
     *               Denomination:
     *                 type: string
     *               InitialAmount:
     *                 type: number
     *               credexType:
     *                 type: string
     *               securedCredex:
     *                 type: boolean
     *               dueDate:
     *                 type: string
     *                 format: date
     *     responses:
     *       200:
     *         description: Credex offered successfully
     *       400:
     *         description: Bad request
     */
    app.post(`${index_1.apiVersionOneRoute}offerCredex`, jsonParser, (0, validateRequest_1.validateRequest)(credexValidationSchemas_1.offerCredexSchema), offerCredex_1.OfferCredexController);
    /**
     * @swagger
     * /api/v1/acceptCredex:
     *   put:
     *     summary: Accept a Credex offer
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexID
     *               - signerID
     *             properties:
     *               credexID:
     *                 type: string
     *               signerID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credex accepted successfully
     *       400:
     *         description: Bad request
     */
    app.put(`${index_1.apiVersionOneRoute}acceptCredex`, jsonParser, (0, validateRequest_1.validateRequest)(credexValidationSchemas_1.acceptCredexSchema), acceptCredex_1.AcceptCredexController);
    /**
     * @swagger
     * /api/v1/acceptCredexBulk:
     *   put:
     *     summary: Accept multiple Credex offers in bulk
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexIDs
     *               - signerID
     *             properties:
     *               credexIDs:
     *                 type: array
     *                 items:
     *                   type: string
     *               signerID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credexes accepted successfully
     *       400:
     *         description: Bad request
     */
    app.put(`${index_1.apiVersionOneRoute}acceptCredexBulk`, jsonParser, (0, validateRequest_1.validateRequest)({
        credexIDs: (value) => Array.isArray(value) && value.every((id) => credexValidationSchemas_1.acceptCredexSchema.credexID(id)),
        signerID: credexValidationSchemas_1.acceptCredexSchema.signerID,
    }), acceptCredexBulk_1.AcceptCredexBulkController);
    /**
     * @swagger
     * /api/v1/declineCredex:
     *   put:
     *     summary: Decline a Credex offer
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexID
     *             properties:
     *               credexID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credex declined successfully
     *       400:
     *         description: Bad request
     */
    app.put(`${index_1.apiVersionOneRoute}declineCredex`, jsonParser, (0, validateRequest_1.validateRequest)(credexValidationSchemas_1.declineCredexSchema), declineCredex_1.DeclineCredexController);
    /**
     * @swagger
     * /api/v1/cancelCredex:
     *   put:
     *     summary: Cancel a Credex offer
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexID
     *             properties:
     *               credexID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credex cancelled successfully
     *       400:
     *         description: Bad request
     */
    app.put(`${index_1.apiVersionOneRoute}cancelCredex`, jsonParser, (0, validateRequest_1.validateRequest)(credexValidationSchemas_1.cancelCredexSchema), cancelCredex_1.CancelCredexController);
    /**
     * @swagger
     * /api/v1/getCredex:
     *   get:
     *     summary: Get Credex details
     *     tags: [Credex]
     *     parameters:
     *       - in: query
     *         name: credexID
     *         required: true
     *         schema:
     *           type: string
     *       - in: query
     *         name: accountID
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Credex details retrieved successfully
     *       400:
     *         description: Bad request
     *       404:
     *         description: Credex not found
     */
    app.get(`${index_1.apiVersionOneRoute}getCredex`, (0, validateRequest_1.validateRequest)(credexValidationSchemas_1.getCredexSchema, 'query'), getCredex_1.GetCredexController);
    /**
     * @swagger
     * /api/v1/getLedger:
     *   get:
     *     summary: Get account ledger
     *     tags: [Credex]
     *     parameters:
     *       - in: query
     *         name: accountID
     *         required: true
     *         schema:
     *           type: string
     *       - in: query
     *         name: numRows
     *         schema:
     *           type: integer
     *       - in: query
     *         name: startRow
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Ledger retrieved successfully
     *       400:
     *         description: Bad request
     */
    app.get(`${index_1.apiVersionOneRoute}getLedger`, (0, validateRequest_1.validateRequest)(credexValidationSchemas_1.getLedgerSchema, 'query'), getLedger_1.GetLedgerController);
}
//# sourceMappingURL=credexRoutes.js.map