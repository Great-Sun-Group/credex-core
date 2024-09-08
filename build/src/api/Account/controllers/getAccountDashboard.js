"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAccountDashboardController = GetAccountDashboardController;
const GetAccountDashboard_1 = require("../services/GetAccountDashboard");
async function GetAccountDashboardController(req, res) {
    const { memberID, accountID } = req.body;
    if (!memberID || !accountID) {
        return res.status(400).json({ message: "memberID and accountID are required" });
    }
    try {
        const accountDashboard = await (0, GetAccountDashboard_1.GetAccountDashboardService)(memberID, accountID);
        if (!accountDashboard) {
            return res.status(404).json({ message: "Account dashboard not found" });
        }
        return res.status(200).json(accountDashboard);
    }
    catch (error) {
        console.error("Error getting account dashboard:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
//# sourceMappingURL=getAccountDashboard.js.map