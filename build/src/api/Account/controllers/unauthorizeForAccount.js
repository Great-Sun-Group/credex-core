"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizeForAccountController = UnauthorizeForAccountController;
const UnauthorizeForAccount_1 = require("../services/UnauthorizeForAccount");
const logger_1 = __importDefault(require("../../../../config/logger"));
/**
 * Controller for unauthorizing a member for an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function UnauthorizeForAccountController(req, res, next) {
    const requiredFields = ["memberIDtoBeUnauthorized", "accountID", "ownerID"];
    try {
        for (const field of requiredFields) {
            if (!req.body[field]) {
                res.status(400).json({ message: `${field} is required` });
                return;
            }
        }
        const { memberIDtoBeUnauthorized, accountID, ownerID } = req.body;
        // Validate memberIDtoBeUnauthorized
        if (typeof memberIDtoBeUnauthorized !== 'string' || !/^[a-f0-9-]{36}$/.test(memberIDtoBeUnauthorized)) {
            res.status(400).json({ message: "Invalid memberIDtoBeUnauthorized. Must be a valid UUID." });
            return;
        }
        // Validate accountID
        if (typeof accountID !== 'string' || !/^[a-f0-9-]{36}$/.test(accountID)) {
            res.status(400).json({ message: "Invalid accountID. Must be a valid UUID." });
            return;
        }
        // Validate ownerID
        if (typeof ownerID !== 'string' || !/^[a-f0-9-]{36}$/.test(ownerID)) {
            res.status(400).json({ message: "Invalid ownerID. Must be a valid UUID." });
            return;
        }
        logger_1.default.info("Unauthorizing member for account", { memberIDtoBeUnauthorized, accountID, ownerID });
        const responseData = await (0, UnauthorizeForAccount_1.UnauthorizeForCompanyService)(memberIDtoBeUnauthorized, accountID, ownerID);
        if (!responseData) {
            logger_1.default.warn("Failed to unauthorize member for account", { memberIDtoBeUnauthorized, accountID, ownerID });
            res.status(400).json({ message: "Failed to unauthorize member for the account" });
            return;
        }
        logger_1.default.info("Member unauthorized for account successfully", { memberIDtoBeUnauthorized, accountID, ownerID });
        res.status(200).json(responseData);
    }
    catch (error) {
        logger_1.default.error("Error in UnauthorizeForAccountController", { error, memberIDtoBeUnauthorized: req.body.memberIDtoBeUnauthorized, accountID: req.body.accountID, ownerID: req.body.ownerID });
        next(error);
    }
}
//# sourceMappingURL=unauthorizeForAccount.js.map