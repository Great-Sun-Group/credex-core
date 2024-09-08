"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAccountController = UpdateAccountController;
const UpdateAccount_1 = require("../services/UpdateAccount");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function UpdateAccountController(req, res, next) {
    const { ownerID, accountID, accountName, accountHandle, defaultDenom } = req.body;
    try {
        // Validate input
        if (!(0, validators_1.validateUUID)(ownerID)) {
            return res.status(400).json({ message: "Invalid ownerID" });
        }
        if (!(0, validators_1.validateUUID)(accountID)) {
            return res.status(400).json({ message: "Invalid accountID" });
        }
        if (accountName && !(0, validators_1.validateAccountName)(accountName)) {
            return res.status(400).json({ message: "Invalid accountName" });
        }
        if (accountHandle && !(0, validators_1.validateAccountHandle)(accountHandle)) {
            return res.status(400).json({ message: "Invalid accountHandle" });
        }
        if (defaultDenom && !(0, validators_1.validateDenomination)(defaultDenom)) {
            return res.status(400).json({ message: "Invalid defaultDenom" });
        }
        logger_1.default.info("Updating account", { ownerID, accountID, accountName, accountHandle, defaultDenom });
        const updatedAccountID = await (0, UpdateAccount_1.UpdateAccountService)(ownerID, accountID, accountName, accountHandle, defaultDenom);
        if (updatedAccountID) {
            logger_1.default.info("Account updated successfully", { updatedAccountID });
            res.status(200).json({ message: `Account updated successfully`, accountID: updatedAccountID });
        }
        else {
            logger_1.default.warn("Account not found or no update performed", { ownerID, accountID });
            res.status(404).json({ message: "Account not found or no update performed" });
        }
    }
    catch (error) {
        logger_1.default.error("Error in UpdateAccountController", { error, ownerID, accountID });
        next(error);
    }
}
//# sourceMappingURL=updateAccount.js.map