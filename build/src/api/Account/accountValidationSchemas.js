"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSendOffersToSchema = exports.unauthorizeForAccountSchema = exports.authorizeForAccountSchema = exports.updateAccountSchema = exports.getAccountByHandleSchema = exports.createAccountSchema = void 0;
const validateRequest_1 = require("../../../middleware/validateRequest");
exports.createAccountSchema = {
    ownerID: validateRequest_1.v.validateUUID,
    accountName: validateRequest_1.v.validateAccountName,
    accountHandle: validateRequest_1.v.validateAccountHandle,
    defaultDenom: validateRequest_1.v.validateDenomination,
};
exports.getAccountByHandleSchema = {
    accountHandle: validateRequest_1.v.validateAccountHandle,
};
exports.updateAccountSchema = {
    accountID: validateRequest_1.v.validateUUID,
    accountName: validateRequest_1.v.validateAccountName,
    accountHandle: validateRequest_1.v.validateAccountHandle,
};
exports.authorizeForAccountSchema = {
    accountID: validateRequest_1.v.validateUUID,
    memberID: validateRequest_1.v.validateUUID,
};
exports.unauthorizeForAccountSchema = {
    accountID: validateRequest_1.v.validateUUID,
    memberID: validateRequest_1.v.validateUUID,
};
exports.updateSendOffersToSchema = {
    accountID: validateRequest_1.v.validateUUID,
    memberID: validateRequest_1.v.validateUUID,
};
//# sourceMappingURL=accountValidationSchemas.js.map