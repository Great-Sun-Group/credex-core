"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptRecurringController = AcceptRecurringController;
const AcceptRecurring_1 = require("../services/AcceptRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const validators_1 = require("../../../utils/validators");
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
        const { avatarID, signerID } = req.body;
        // Validate required fields
        if (!avatarID || !signerID) {
            return res.status(400).json({ error: "avatarID and signerID are required" });
        }
        // Validate UUIDs
        if (!(0, validators_1.validateUUID)(avatarID)) {
            return res.status(400).json({ error: "Invalid avatarID" });
        }
        if (!(0, validators_1.validateUUID)(signerID)) {
            return res.status(400).json({ error: "Invalid signerID" });
        }
        // Call AcceptRecurringService to process the acceptance
        const acceptRecurringData = await (0, AcceptRecurring_1.AcceptRecurringService)({
            avatarID,
            signerID
        });
        // Check if the service call was successful
        if (typeof acceptRecurringData.recurring === "boolean") {
            return res.status(400).json({ error: acceptRecurringData.message });
        }
        // Fetch dashboard data
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(signerID, acceptRecurringData.recurring.acceptorAccountID);
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