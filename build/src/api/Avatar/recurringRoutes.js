"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RecurringRoutes;
const index_1 = require("../../index");
const requestRecurring_1 = require("./controllers/requestRecurring");
const acceptRecurring_1 = require("./controllers/acceptRecurring");
const cancelRecurring_1 = require("./controllers/cancelRecurring");
const errorHandler_1 = require("../../middleware/errorHandler");
const validateRequest_1 = require("../../middleware/validateRequest");
const avatarValidationSchemas_1 = require("./avatarValidationSchemas");
function RecurringRoutes(app, jsonParser) {
    /**
     * @swagger
     * /api/v1/requestRecurring:
     *   post:
     *     summary: Request a recurring payment
     *     tags: [Recurring]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RequestRecurring'
     *     responses:
     *       200:
     *         description: Recurring payment requested successfully
     *       400:
     *         description: Bad request
     */
    app.post(`${index_1.apiVersionOneRoute}requestRecurring`, jsonParser, (0, validateRequest_1.validateRequest)(avatarValidationSchemas_1.requestRecurringSchema), requestRecurring_1.RequestRecurringController, errorHandler_1.errorHandler);
    /**
     * @swagger
     * /api/v1/acceptRecurring:
     *   put:
     *     summary: Accept a recurring payment request
     *     tags: [Recurring]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AcceptRecurring'
     *     responses:
     *       200:
     *         description: Recurring payment accepted successfully
     *       400:
     *         description: Bad request
     */
    app.put(`${index_1.apiVersionOneRoute}acceptRecurring`, jsonParser, (0, validateRequest_1.validateRequest)(avatarValidationSchemas_1.acceptRecurringSchema), acceptRecurring_1.AcceptRecurringController, errorHandler_1.errorHandler);
    /**
     * @swagger
     * /api/v1/cancelRecurring:
     *   delete:
     *     summary: Cancel a recurring payment
     *     tags: [Recurring]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CancelRecurring'
     *     responses:
     *       200:
     *         description: Recurring payment cancelled successfully
     *       400:
     *         description: Bad request
     */
    app.delete(`${index_1.apiVersionOneRoute}cancelRecurring`, jsonParser, (0, validateRequest_1.validateRequest)(avatarValidationSchemas_1.cancelRecurringSchema), cancelRecurring_1.DeclineRecurringController, errorHandler_1.errorHandler);
}
/**
 * @swagger
 * components:
 *   schemas:
 *     RequestRecurring:
 *       type: object
 *       required:
 *         - signerMemberID
 *         - requestorAccountID
 *         - counterpartyAccountID
 *         - InitialAmount
 *         - Denomination
 *         - nextPayDate
 *         - daysBetweenPays
 *       properties:
 *         signerMemberID:
 *           type: string
 *           format: uuid
 *         requestorAccountID:
 *           type: string
 *           format: uuid
 *         counterpartyAccountID:
 *           type: string
 *           format: uuid
 *         InitialAmount:
 *           type: number
 *         Denomination:
 *           type: string
 *         nextPayDate:
 *           type: string
 *           format: date
 *         daysBetweenPays:
 *           type: integer
 *         securedCredex:
 *           type: boolean
 *         credspan:
 *           type: integer
 *           minimum: 7
 *           maximum: 35
 *         remainingPays:
 *           type: integer
 *           minimum: 0
 *     AcceptRecurring:
 *       type: object
 *       required:
 *         - avatarID
 *         - signerID
 *       properties:
 *         avatarID:
 *           type: string
 *           format: uuid
 *         signerID:
 *           type: string
 *           format: uuid
 *     CancelRecurring:
 *       type: object
 *       required:
 *         - signerID
 *         - cancelerAccountID
 *         - avatarID
 *       properties:
 *         signerID:
 *           type: string
 *           format: uuid
 *         cancelerAccountID:
 *           type: string
 *           format: uuid
 *         avatarID:
 *           type: string
 *           format: uuid
 */
//# sourceMappingURL=recurringRoutes.js.map