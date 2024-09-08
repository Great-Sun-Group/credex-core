"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestRecurringController = RequestRecurringController;
const RequestRecurring_1 = require("../services/RequestRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const avatarSchemas_1 = require("../validators/avatarSchemas");
/**
 * RequestRecurringController
 *
 * This controller handles the creation of recurring payment requests.
 * It validates the input, calls the RequestRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function RequestRecurringController(req, res) {
    try {
        const { error, value } = avatarSchemas_1.requestRecurringSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: error.details.map(detail => detail.message) });
        }
        const createRecurringData = await (0, RequestRecurring_1.RequestRecurringService)(value);
        if (!createRecurringData) {
            logger_1.default.error("Failed to create recurring payment", { error: "RequestRecurringService returned null" });
            return res.status(500).json({ error: "Failed to create recurring payment" });
        }
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(value.signerMemberID, value.requestorAccountID);
        if (!dashboardData) {
            logger_1.default.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null" });
            return res.status(500).json({ error: "Failed to fetch dashboard data" });
        }
        logger_1.default.info("Recurring payment requested successfully", { avatarMemberID: createRecurringData });
        return res.status(200).json({
            avatarMemberID: createRecurringData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        logger_1.default.error("Error in RequestRecurringController", { error: err.message });
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=requestRecurring.js.map