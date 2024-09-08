"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptRecurringController = AcceptRecurringController;
const AcceptRecurring_1 = require("../services/AcceptRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const avatarSchemas_1 = require("../validators/avatarSchemas");
/**
 * AcceptRecurringController
 *
 * This controller handles the acceptance of recurring transactions.
 * It validates the required fields, calls the AcceptRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function AcceptRecurringController(req, res) {
    try {
        const { error, value } = avatarSchemas_1.acceptRecurringSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: error.details.map(detail => detail.message) });
        }
        const { avatarID, signerID } = value;
        // Call AcceptRecurringService to process the acceptance
        const acceptRecurringData = await (0, AcceptRecurring_1.AcceptRecurringService)({ avatarID, signerID });
        // Check if the service call was successful
        if (typeof acceptRecurringData.recurring === "boolean") {
            logger_1.default.error("Failed to accept recurring payment", { error: acceptRecurringData.message });
            return res.status(400).json({ error: acceptRecurringData.message });
        }
        // Fetch dashboard data
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(signerID, acceptRecurringData.recurring.acceptorAccountID);
        if (!dashboardData) {
            logger_1.default.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null" });
            return res.status(500).json({ error: "Failed to fetch dashboard data" });
        }
        logger_1.default.info("Recurring payment accepted successfully", { avatarID, signerID });
        // Return the acceptance data and dashboard data
        return res.status(200).json({
            acceptRecurringData: acceptRecurringData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        logger_1.default.error("Error in AcceptRecurringController", { error: err.message });
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=acceptRecurring.js.map