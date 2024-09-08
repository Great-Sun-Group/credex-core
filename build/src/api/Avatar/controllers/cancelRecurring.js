"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclineRecurringController = DeclineRecurringController;
const CancelRecurring_1 = require("../services/CancelRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function DeclineRecurringController(req, res) {
    try {
        const { signerID, cancelerAccountID, avatarID } = req.body;
        if (!(0, validators_1.validateUUID)(signerID)) {
            return res.status(400).json({ error: "Invalid signerID" });
        }
        if (!(0, validators_1.validateUUID)(cancelerAccountID)) {
            return res.status(400).json({ error: "Invalid cancelerAccountID" });
        }
        if (!(0, validators_1.validateUUID)(avatarID)) {
            return res.status(400).json({ error: "Invalid avatarID" });
        }
        const cancelRecurringData = await (0, CancelRecurring_1.CancelRecurringService)(signerID, cancelerAccountID, avatarID);
        if (!cancelRecurringData) {
            logger_1.default.error("Failed to cancel recurring payment", { error: "CancelRecurringService returned null" });
            return res.status(400).json({ error: "Failed to cancel recurring payment" });
        }
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(signerID, cancelerAccountID);
        if (!dashboardData) {
            logger_1.default.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null" });
            return res.status(500).json({ error: "Failed to fetch dashboard data" });
        }
        logger_1.default.info("Recurring payment cancelled successfully", { avatarID, signerID, cancelerAccountID });
        return res.status(200).json({
            cancelRecurringData: cancelRecurringData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        logger_1.default.error("Error in DeclineRecurringController", { error: err.message });
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=cancelRecurring.js.map