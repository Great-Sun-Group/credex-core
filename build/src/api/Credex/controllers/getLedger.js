"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetLedgerController = GetLedgerController;
const GetLedger_1 = require("../services/GetLedger");
async function GetLedgerController(req, res) {
    try {
        // Validate required fields
        if (!req.body.accountID) {
            return res.status(400).json({ error: "accountID is required" });
        }
        // Validate and set default values for optional fields
        const numRows = req.body.numRows ? parseInt(req.body.numRows) : 10;
        const startRow = req.body.startRow ? parseInt(req.body.startRow) : 0;
        if (isNaN(numRows) || isNaN(startRow) || numRows < 1 || startRow < 0) {
            return res.status(400).json({ error: "Invalid numRows or startRow" });
        }
        const responseData = await (0, GetLedger_1.GetLedgerService)(req.body.accountID, numRows, startRow);
        res.json(responseData);
    }
    catch (err) {
        console.error("Error in GetLedgerController:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=getLedger.js.map