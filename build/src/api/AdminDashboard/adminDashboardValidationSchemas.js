"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountSchema = exports.updateMemberTierSchema = exports.getMemberSchema = exports.getCredexSchema = void 0;
const validateRequest_1 = require("../../middleware/validateRequest");
exports.getCredexSchema = {
    credexID: validateRequest_1.v.validateUUID,
};
exports.getMemberSchema = {
    memberID: validateRequest_1.v.validateUUID,
};
exports.updateMemberTierSchema = {
    memberID: validateRequest_1.v.validateUUID,
    tier: validateRequest_1.v.validateTier,
};
exports.getAccountSchema = {
    accountID: validateRequest_1.v.validateUUID,
};
//# sourceMappingURL=adminDashboardValidationSchemas.js.map