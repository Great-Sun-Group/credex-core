"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberTierSchema = exports.getMemberSchema = exports.getCredexSchema = exports.getAccountSchema = void 0;
const validateRequest_1 = require("../../middleware/validateRequest");
exports.getAccountSchema = {
    accountID: validateRequest_1.v.validateUUID,
};
exports.getCredexSchema = {
    credexID: validateRequest_1.v.validateUUID,
};
exports.getMemberSchema = {
    memberID: validateRequest_1.v.validateUUID,
};
exports.updateMemberTierSchema = {
    memberID: validateRequest_1.v.validateUUID,
    newTier: validateRequest_1.v.validateTier,
};
// Add more schemas as needed for other AdminDashboard operations
//# sourceMappingURL=adminDashboardValidationSchemas.js.map