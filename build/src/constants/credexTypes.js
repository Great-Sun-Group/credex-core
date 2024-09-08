"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credexTypes = void 0;
exports.checkPermittedCredexType = checkPermittedCredexType;
exports.credexTypes = [
    "PURCHASE",
    "GIFT",
    "DCO_GIVE",
    "DCO_RECEIVE"
];
function checkPermittedCredexType(credexTypeToCheck) {
    return exports.credexTypes.includes(credexTypeToCheck);
}
//# sourceMappingURL=credexTypes.js.map