"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAccountByHandleController = GetAccountByHandleController;
const GetAccountByHandle_1 = require("../services/GetAccountByHandle");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
/**
 * Controller for retrieving an account by its handle
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function GetAccountByHandleController(req, res, next) {
    const { accountHandle } = req.query;
    try {
        if (!(0, validators_1.validateAccountHandle)(accountHandle)) {
            res.status(400).json({ message: "Invalid account handle" });
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