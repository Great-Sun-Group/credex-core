"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptRecurringController = AcceptRecurringController;
const AcceptRecurring_1 = require("../services/AcceptRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
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
        // Validate required fields
        const fieldsRequired = ["avatarID", "signerID"];
        for (const field of fieldsRequired) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        // Call AcceptRecurringService to process the acceptance
        const acceptRecurringData = await (0, AcceptRecurring_1.AcceptRecurringService)({
            avatarID: req.body.avatarID,
            signerID: req.body.signerID
        });
        // Check if the service call was successful
        if (typeof acceptRecurringData.recurring === "boolean") {
            return res.status(400).json({ error: acceptRecurringData.message });
        }
        // Fetch dashboard data
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(req.body.signerID, acceptRecurringData.recurring.acceptorAccountID);
        if (!dashboardData) {
            return res.status(404).json({ error: "Failed to fetch dashboard data" });
        }
        // Return the acceptance data and dashboard data
        return res.status(200).json({
            acceptRecurringData: acceptRecurringData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        console.error("Error in AcceptRecurringController:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=acceptRecurring.js.map