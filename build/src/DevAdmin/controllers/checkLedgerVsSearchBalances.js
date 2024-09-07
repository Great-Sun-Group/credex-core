"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckLedgerVsSearchBalancesController = CheckLedgerVsSearchBalancesController;
const CheckLedgerVsSearchBalances_1 = require("../services/CheckLedgerVsSearchBalances");
async function CheckLedgerVsSearchBalancesController(_req, res) {
    try {
        const balanceCheck = await (0, CheckLedgerVsSearchBalances_1.CheckLedgerVsSearchBalances)();
        // Send a success response
        res.status(200).json({ balanceCheck });
    }
    catch (err) {
        // Handle errors and send an appropriate error response
        console.error("Error checking balances:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
//# sourceMappingURL=checkLedgerVsSearchBalances.js.map