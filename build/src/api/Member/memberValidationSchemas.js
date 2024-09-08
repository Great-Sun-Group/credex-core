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
    name: validateRequest_1.v.validateName,
    email: validateRequest_1.v.validateEmail,
    phone: validateRequest_1.v.validatePhone,
    handle: validateRequest_1.v.validateMemberHandle,
};
exports.updateMemberTierSchema = {
    memberID: validateRequest_1.v.validateUUID,
    newTier: validateRequest_1.v.validateTier,
};
exports.securedCredexAuthForTierSchema = {
    memberID: validateRequest_1.v.validateUUID,
    tier: validateRequest_1.v.validateTier,
};
// Add more schemas as needed for other Member operations
//# sourceMappingURL=memberValidationSchemas.js.map