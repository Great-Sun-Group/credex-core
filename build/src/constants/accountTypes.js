"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountTypes = void 0;
exports.checkPermittedAccountType = checkPermittedAccountType;
exports.accountTypes = ["PERSONAL_CONSUMPTION", "BUSINESS", "CREDEX_FOUNDATION"];
function checkPermittedAccountType(credexTypeToCheck) {
    return exports.accountTypes.includes(credexTypeToCheck);
}
//# sourceMappingURL=accountTypes.js.map