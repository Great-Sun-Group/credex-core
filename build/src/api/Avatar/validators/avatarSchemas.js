"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRecurringSchema = exports.acceptRecurringSchema = exports.requestRecurringSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.requestRecurringSchema = joi_1.default.object({
    signerMemberID: joi_1.default.string().uuid().required(),
    requestorAccountID: joi_1.default.string().uuid().required(),
    counterpartyAccountID: joi_1.default.string().uuid().required(),
    InitialAmount: joi_1.default.number().positive().required(),
    Denomination: joi_1.default.string().required(),
    nextPayDate: joi_1.default.date().iso().required(),
    daysBetweenPays: joi_1.default.number().integer().positive().required(),
    securedCredex: joi_1.default.boolean(),
    credspan: joi_1.default.when('securedCredex', {
        is: true,
        then: joi_1.default.forbidden(),
        otherwise: joi_1.default.number().integer().min(7).max(35).required()
    }),
    remainingPays: joi_1.default.number().integer().min(0)
});
exports.acceptRecurringSchema = joi_1.default.object({
    avatarID: joi_1.default.string().uuid().required(),
    signerID: joi_1.default.string().uuid().required()
});
exports.cancelRecurringSchema = joi_1.default.object({
    signerID: joi_1.default.string().uuid().required(),
    cancelerAccountID: joi_1.default.string().uuid().required(),
    avatarID: joi_1.default.string().uuid().required()
});
//# sourceMappingURL=avatarSchemas.js.map