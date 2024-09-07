"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUID = validateUUID;
exports.validateMemberHandle = validateMemberHandle;
exports.validateAccountName = validateAccountName;
exports.validateAccountHandle = validateAccountHandle;
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
//# sourceMappingURL=validators.js.map