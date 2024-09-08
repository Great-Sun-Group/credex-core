"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUID = validateUUID;
exports.validateMemberHandle = validateMemberHandle;
exports.validateAccountName = validateAccountName;
exports.validateAccountHandle = validateAccountHandle;
exports.validateEmail = validateEmail;
exports.validatePhone = validatePhone;
exports.validateAmount = validateAmount;
exports.validateDenomination = validateDenomination;
exports.validateCredexType = validateCredexType;
exports.validateName = validateName;
exports.validateTier = validateTier;
exports.validatePositiveInteger = validatePositiveInteger;
const credexTypes_1 = require("../constants/credexTypes");
const denominations_1 = require("../constants/denominations");
function validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
function validateMemberHandle(handle) {
    const handleRegex = /^[a-z0-9._]{3,30}$/;
    return handleRegex.test(handle);
}
function validateAccountName(name) {
    return name.length >= 3 && name.length <= 50;
}
function validateAccountHandle(handle) {
    const handleRegex = /^[a-z0-9._]{3,30}$/;
    return handleRegex.test(handle);
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function validatePhone(phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
}
function validateAmount(amount) {
    return typeof amount === 'number' && amount > 0 && isFinite(amount);
}
function validateDenomination(denomination) {
    return (0, denominations_1.isValidDenomination)(denomination);
}
function validateCredexType(type) {
    return credexTypes_1.credexTypes.includes(type);
}
function validateName(name) {
    return name.length >= 3 && name.length <= 50;
}
function validateTier(tier) {
    return Number.isInteger(tier) && tier >= 1;
}
function validatePositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
}
//# sourceMappingURL=validators.js.map