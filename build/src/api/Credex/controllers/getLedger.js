"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetLedgerController = GetLedgerController;
const GetLedger_1 = require("../services/GetLedger");
const logger_1 = require("../../../utils/logger");
const validators_1 = require("../../../utils/validators");
/**
 * GetLedgerController
 *
 * This controller handles retrieving the ledger for an account.
 * It validates the required fields, calls the GetLedgerService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function GetLedgerController(req, res) {
    try {
        const { accountID, numRows, startRow } = req.query;
        if (!(0, validators_1.validateUUID)(accountID)) {
            (0, logger_1.logError)("GetLedgerController: Invalid accountID", new Error(), { accountID });
            return res.status(400).json({ error: "Invalid accountID" });
        }
        const parsedNumRows = numRows ? parseInt(numRows, 10) : 10;
        const parsedStartRow = startRow ? parseInt(startRow, 10) : 0;
        if (!(0, validators_1.validatePositiveInteger)(parsedNumRows)) {
            (0, logger_1.logError)("GetLedgerController: Invalid numRows", new Error(), { numRows });
            return res.status(400).json({ error: "Invalid numRows. Must be a positive integer." });
        }
        if (!Number.isInteger(parsedStartRow) || parsedStartRow < 0) {
            (0, logger_1.logError)("GetLedgerController: Invalid startRow", new Error(), { startRow });
            return res.status(400).json({ error: "Invalid startRow. Must be a non-negative integer." });
        }
        const responseData = await (0, GetLedger_1.GetLedgerService)(accountID, parsedNumRows, parsedStartRow);
        if (!responseData) {
            (0, logger_1.logError)("GetLedgerController: Failed to retrieve ledger", new Error(), { accountID, numRows: parsedNumRows, startRow: parsedStartRow });
            return res.status(404).json({ error: "Failed to retrieve ledger" });
        }
        (0, logger_1.logInfo)("GetLedgerController: Ledger retrieved successfully", { accountID, numRows: parsedNumRows, startRow: parsedStartRow });
        return res.status(200).json(responseData);
    }
    catch (err) {
        (0, logger_1.logError)("GetLedgerController: Unhandled error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=getLedger.js.map