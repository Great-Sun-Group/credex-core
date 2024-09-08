"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMemberDashboardByPhoneController = GetMemberDashboardByPhoneController;
const GetMemberDashboardByPhone_1 = require("../services/GetMemberDashboardByPhone");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
/**
 * Controller for retrieving a member's dashboard by phone number
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function GetMemberDashboardByPhoneController(req, res, next) {
    try {
        const { phone } = req.body;
        if (!phone) {
            res.status(400).json({ message: "Phone number is required" });
            return;
        }
        logger_1.default.info("Retrieving member dashboard by phone", { phone });
        const memberDashboard = await (0, GetMemberDashboardByPhone_1.GetMemberDashboardByPhoneService)(phone);
        if (!memberDashboard) {
            logger_1.default.warn("Could not retrieve member dashboard", { phone });
            res.status(404).json({ message: "Could not retrieve member dashboard" });
            return;
        }
        const accountDashboards = await Promise.all(memberDashboard.accountIDS.map(async (accountId) => {
            return (0, GetAccountDashboard_1.GetAccountDashboardService)(memberDashboard.memberID, accountId);
        }));
        logger_1.default.info("Member dashboard retrieved successfully", { phone, memberID: memberDashboard.memberID });
        res.status(200).json({ memberDashboard, accountDashboards });
    }
    catch (error) {
        logger_1.default.error("Error in GetMemberDashboardByPhoneController", { error: error.message, phone: req.body.phone });
        next(error);
    }
}
//# sourceMappingURL=getMemberDashboardByPhone.js.map