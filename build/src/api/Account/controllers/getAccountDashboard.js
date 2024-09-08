"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAccountDashboardController = GetAccountDashboardController;
const GetAccountDashboard_1 = require("../services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function GetAccountDashboardController(req, res, next) {
    const { memberID, accountID } = req.body;
    try {
        if (!(0, validators_1.validateUUID)(memberID)) {
            return res.status(400).json({ message: "Invalid memberID" });
        }
        if (!(0, validators_1.validateUUID)(accountID)) {
            return res.status(400).json({ message: "Invalid accountID" });
        }
        logger_1.default.info("Getting account dashboard", { memberID, accountID });
        const accountDashboard = await (0, GetAccountDashboard_1.GetAccountDashboardService)(memberID, accountID);
        if (!accountDashboard) {
            logger_1.default.warn("Account dashboard not found", { memberID, accountID });
            return res.status(404).json({ message: "Account dashboard not found" });
        }
        logger_1.default.info("Account dashboard retrieved successfully", { memberID, accountID });
        return res.status(200).json(accountDashboard);
    }
    catch (error) {
        logger_1.default.error("Error in GetAccountDashboardController", { error, memberID, accountID });
        next(error);
    }
}
//# sourceMappingURL=getAccountDashboard.js.map