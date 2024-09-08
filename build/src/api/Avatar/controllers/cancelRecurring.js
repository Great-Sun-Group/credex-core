"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclineRecurringController = DeclineRecurringController;
const CancelRecurring_1 = require("../services/CancelRecurring");
const getAccountDashboard_1 = require("../../Account/controllers/getAccountDashboard");
async function DeclineRecurringController(req, res) {
    const fieldsRequired = ["signerID", "cancelerAccountID", "avatarID"];
    for (const field of fieldsRequired) {
        if (!req.body[field]) {
            return res
                .status(400)
                .json({ message: `${field} is required` })
                .send();
        }
    }
    try {
        const cancelRecurringData = await (0, CancelRecurring_1.CancelRecurringService)(req.body.signerID, req.body.cancelerAccountID, req.body.avatarID);
        if (!cancelRecurringData) {
            return res.status(400).json(cancelRecurringData);
        }
        const dashboardReq = {
            body: {
                memberID: req.body.signerID,
                accountID: req.body.cancelerAccountID
            }
        };
        const dashboardRes = {
            status: (code) => ({
                json: (data) => data
            })
        };
        const dashboardData = await (0, getAccountDashboard_1.GetAccountDashboardController)(dashboardReq, dashboardRes);
        res.json({
            cancelRecurringData: cancelRecurringData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        console.error("Error in DeclineRecurringController:", err);
        res.status(500).json({ error: err.message });
    }
}
//# sourceMappingURL=cancelRecurring.js.map