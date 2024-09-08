"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptCredexController = AcceptCredexController;
const AcceptCredex_1 = require("../services/AcceptCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const validators_1 = require("../../../utils/validators");
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
        const { credexID, signerID } = req.body;
        // Validate required fields
        if (!credexID || !signerID) {
            return res.status(400).json({ error: "credexID and signerID are required" });
        }
        // Validate UUIDs
        if (!(0, validators_1.validateUUID)(credexID)) {
            return res.status(400).json({ error: "Invalid credexID" });
        }
        if (!(0, validators_1.validateUUID)(signerID)) {
            return res.status(400).json({ error: "Invalid signerID" });
        }
        const acceptCredexData = await (0, AcceptCredex_1.AcceptCredexService)(credexID, signerID);
        if (!acceptCredexData) {
            return res.status(400).json({ error: "Failed to accept Credex" });
        }
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(signerID, acceptCredexData.acceptorAccountID);
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