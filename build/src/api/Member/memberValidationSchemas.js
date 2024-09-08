"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securedCredexAuthForTierSchema = exports.updateMemberTierSchema = exports.onboardMemberSchema = exports.getMemberDashboardByPhoneSchema = exports.getMemberByHandleSchema = void 0;
const validateRequest_1 = require("../../middleware/validateRequest");
exports.getMemberByHandleSchema = {
    memberHandle: validateRequest_1.v.validateMemberHandle,
};
exports.getMemberDashboardByPhoneSchema = {
    phone: validateRequest_1.v.validatePhone,
};
exports.onboardMemberSchema = {
    firstname: validateRequest_1.v.validateName,
    lastname: validateRequest_1.v.validateName,
    phone: validateRequest_1.v.validatePhone,
};
exports.updateMemberTierSchema = {
    memberID: validateRequest_1.v.validateUUID,
    tier: validateRequest_1.v.validateTier,
};
exports.securedCredexAuthForTierSchema = {
    memberID: validateRequest_1.v.validateUUID,
    tier: validateRequest_1.v.validateTier,
    Amount: validateRequest_1.v.validateAmount,
    Denomination: validateRequest_1.v.validateDenomination,
};
//# sourceMappingURL=memberValidationSchemas.js.map