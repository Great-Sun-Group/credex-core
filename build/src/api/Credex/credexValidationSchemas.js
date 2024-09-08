"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLedgerSchema = exports.getCredexSchema = exports.cancelCredexSchema = exports.declineCredexSchema = exports.acceptCredexSchema = exports.offerCredexSchema = void 0;
const validateRequest_1 = require("../../middleware/validateRequest");
exports.offerCredexSchema = {
    offerorAccountID: validateRequest_1.v.validateUUID,
    receiverAccountID: validateRequest_1.v.validateUUID,
    amount: validateRequest_1.v.validateAmount,
    denomination: validateRequest_1.v.validateDenomination,
    credexType: validateRequest_1.v.validateCredexType,
    credspan: validateRequest_1.v.validatePositiveInteger,
};
exports.acceptCredexSchema = {
    credexID: validateRequest_1.v.validateUUID,
    signerID: validateRequest_1.v.validateUUID,
};
exports.declineCredexSchema = {
    credexID: validateRequest_1.v.validateUUID,
    signerID: validateRequest_1.v.validateUUID,
};
exports.cancelCredexSchema = {
    credexID: validateRequest_1.v.validateUUID,
    signerID: validateRequest_1.v.validateUUID,
};
exports.getCredexSchema = {
    credexID: validateRequest_1.v.validateUUID,
};
exports.getLedgerSchema = {
    accountID: validateRequest_1.v.validateUUID,
};
// Add more schemas as needed for other Credex operations
//# sourceMappingURL=credexValidationSchemas.js.map