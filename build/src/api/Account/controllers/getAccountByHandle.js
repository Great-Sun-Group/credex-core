"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAccountByHandleController = GetAccountByHandleController;
const GetAccountByHandle_1 = require("../services/GetAccountByHandle");
const logger_1 = __importDefault(require("../../../../config/logger"));
/**
 * Controller for retrieving an account by its handle
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function GetAccountByHandleController(req, res, next) {
    const { accountHandle } = req.body;
    try {
        if (!accountHandle || typeof accountHandle !== 'string') {
            res.status(400).json({ message: "accountHandle is required and must be a string" });
            return;
        }
        // Validate accountHandle format
        if (!/^[a-z0-9._]{3,30}$/.test(accountHandle)) {
            res.status(400).json({
                message: "Invalid account handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.",
            });
            return;
        }
        logger_1.default.info("Retrieving account by handle", { accountHandle });
        const accountData = await (0, GetAccountByHandle_1.GetAccountByHandleService)(accountHandle);
        if (accountData) {
            logger_1.default.info("Account retrieved successfully", { accountHandle });
            res.status(200).json({ accountData });
        }
        else {
            logger_1.default.info("Account not found", { accountHandle });
            res.status(404).json({ message: "Account not found" });
        }
    }
    catch (error) {
        logger_1.default.error("Error in GetAccountByHandleController", { error, accountHandle });
        next(error);
    }
}
//# sourceMappingURL=getAccountByHandle.js.map