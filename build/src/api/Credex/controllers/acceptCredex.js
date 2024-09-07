"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptCredexController = AcceptCredexController;
const AcceptCredex_1 = require("../services/AcceptCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
/**
 * AcceptCredexController
 *
 * This controller handles the acceptance of Credex offers.
 * It validates the required fields, calls the AcceptCredexService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function AcceptCredexController(req, res) {
    try {
        // Validate required fields
        const fieldsRequired = ["credexID", "signerID"];
        for (const field of fieldsRequired) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        const acceptCredexData = await (0, AcceptCredex_1.AcceptCredexService)(req.body.credexID, req.body.signerID);
        if (!acceptCredexData) {
            return res.status(400).json({ error: "Failed to accept Credex" });
        }
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(req.body.signerID, acceptCredexData.acceptorAccountID);
        if (!dashboardData) {
            return res.status(404).json({ error: "Failed to fetch dashboard data" });
        }
        return res.status(200).json({
            acceptCredexData: acceptCredexData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        console.error("Error in AcceptCredexController:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=acceptCredex.js.map