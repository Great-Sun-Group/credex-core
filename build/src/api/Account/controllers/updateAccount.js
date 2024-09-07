"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAccountController = UpdateAccountController;
const UpdateAccount_1 = require("../services/UpdateAccount");
const logger_1 = __importDefault(require("../../../../config/logger"));
const denominations_1 = require("../../../constants/denominations");
/**
 * Controller for updating an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function UpdateAccountController(req, res, next) {
    const requiredFields = ["ownerID", "accountID"];
    try {
        for (const field of requiredFields) {
            if (!req.body[field]) {
                res.status(400).json({ message: `${field} is required` });
                return;
            }
        }
        const { ownerID, accountID, accountName, accountHandle, defaultDenom } = req.body;
        // Validate ownerID
        if (typeof ownerID !== 'string' || !/^[a-f0-9-]{36}$/.test(ownerID)) {
            res.status(400).json({ message: "Invalid ownerID. Must be a valid UUID." });
            return;
        }
        // Validate accountID
        if (typeof accountID !== 'string' || !/^[a-f0-9-]{36}$/.test(accountID)) {
            res.status(400).json({ message: "Invalid accountID. Must be a valid UUID." });
            return;
        }
        // Validate accountName if provided
        if (accountName && (typeof accountName !== 'string' || accountName.length < 3 || accountName.length > 50)) {
            res.status(400).json({ message: "Invalid accountName. Must be a string between 3 and 50 characters." });
            return;
        }
        // Validate accountHandle if provided
        if (accountHandle && (typeof accountHandle !== 'string' || !/^[a-z0-9._]{3,30}$/.test(accountHandle))) {
            res.status(400).json({ message: "Invalid accountHandle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters." });
            return;
        }
        // Validate defaultDenom if provided
        if (defaultDenom && (!(0, denominations_1.getDenominations)({ code: defaultDenom }).length)) {
            res.status(400).json({ message: "Invalid defaultDenom. Must be a valid denomination." });
            return;
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
        logger_1.default.error("Error in UpdateAccountController", { error, ownerID: req.body.ownerID, accountID: req.body.accountID });
        next(error);
    }
}
//# sourceMappingURL=updateAccount.js.map