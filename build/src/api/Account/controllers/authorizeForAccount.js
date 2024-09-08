"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizeForAccountController = AuthorizeForAccountController;
const AuthorizeForAccount_1 = require("../services/AuthorizeForAccount");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function AuthorizeForAccountController(req, res, next) {
    const { memberHandleToBeAuthorized, accountID, ownerID } = req.body;
    try {
        // Validate input
        if (!(0, validators_1.validateMemberHandle)(memberHandleToBeAuthorized)) {
            return res.status(400).json({ message: "Invalid memberHandleToBeAuthorized" });
        }
        if (!(0, validators_1.validateUUID)(accountID)) {
            return res.status(400).json({ message: "Invalid accountID" });
        }
        if (!(0, validators_1.validateUUID)(ownerID)) {
            return res.status(400).json({ message: "Invalid ownerID" });
        }
        logger_1.default.info("Authorizing member for account", { memberHandleToBeAuthorized, accountID, ownerID });
        const responseData = await (0, AuthorizeForAccount_1.AuthorizeForAccountService)(memberHandleToBeAuthorized, accountID, ownerID);
        if (!responseData) {
            logger_1.default.warn("Failed to authorize member for account", { memberHandleToBeAuthorized, accountID, ownerID });
            res.status(400).json({ message: "Failed to authorize member for account" });
            return;
        }
        if (responseData.message === "accounts not found") {
            logger_1.default.warn("Accounts not found during authorization", { memberHandleToBeAuthorized, accountID, ownerID });
            res.status(404).json({ message: "Accounts not found" });
            return;
        }
        if (responseData.message === "Limit of 5 authorized accounts reached. Remove an authorized account if you want to add another.") {
            logger_1.default.warn("Authorization limit reached", { memberHandleToBeAuthorized, accountID, ownerID });
            res.status(400).json({ message: responseData.message });
            return;
        }
        if (responseData.message === "You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above.") {
            logger_1.default.warn("Insufficient tier for authorization", { memberHandleToBeAuthorized, accountID, ownerID });
            res.status(403).json({ message: responseData.message });
            return;
        }
        logger_1.default.info("Member authorized for account successfully", { memberHandleToBeAuthorized, accountID, ownerID });
        res.status(200).json(responseData);
    }
    catch (error) {
        logger_1.default.error("Error in AuthorizeForAccountController", { error, memberHandleToBeAuthorized: req.body.memberHandleToBeAuthorized, accountID: req.body.accountID, ownerID: req.body.ownerID });
        next(error);
    }
}
//# sourceMappingURL=authorizeForAccount.js.map