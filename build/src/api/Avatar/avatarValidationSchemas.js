"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRecurringSchema = exports.acceptRecurringSchema = exports.requestRecurringSchema = void 0;
const validateRequest_1 = require("../../../middleware/validateRequest");
exports.requestRecurringSchema = {
    offerorAccountID: validateRequest_1.v.validateUUID,
    receiverAccountID: validateRequest_1.v.validateUUID,
    amount: validateRequest_1.v.validateAmount,
    denomination: validateRequest_1.v.validateDenomination,
    frequency: validateRequest_1.v.validatePositiveInteger,
    duration: validateRequest_1.v.validatePositiveInteger,
};
exports.acceptRecurringSchema = {
    recurringID: validateRequest_1.v.validateUUID,
};
exports.cancelRecurringSchema = {
    recurringID: validateRequest_1.v.validateUUID,
};
// Add more schemas as needed for other Avatar operations
//# sourceMappingURL=avatarValidationSchemas.js.map