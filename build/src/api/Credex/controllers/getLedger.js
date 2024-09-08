"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetLedgerController = GetLedgerController;
const GetLedger_1 = require("../services/GetLedger");
const logger_1 = require("../../../utils/logger");
const joi_1 = __importDefault(require("joi"));
const getLedgerSchema = joi_1.default.object({
    accountID: joi_1.default.string().uuid().required(),
    numRows: joi_1.default.number().integer().min(1).default(10),
    startRow: joi_1.default.number().integer().min(0).default(0)
});
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
        // Validate input using Joi
        const { error, value } = getLedgerSchema.validate(req.query);
        if (error) {
            (0, logger_1.logError)("GetLedgerController input validation failed", error);
            return res.status(400).json({ error: error.details[0].message });
        }
        const { accountID, numRows, startRow } = value;
        const responseData = await (0, GetLedger_1.GetLedgerService)(accountID, numRows, startRow);
        if (!responseData) {
            (0, logger_1.logError)("GetLedgerController: Failed to retrieve ledger", new Error(), { accountID, numRows, startRow });
            return res.status(404).json({ error: "Failed to retrieve ledger" });
        }
        (0, logger_1.logInfo)("GetLedgerController: Ledger retrieved successfully", { accountID, numRows, startRow });
        return res.status(200).json(responseData);
    }
    catch (err) {
        (0, logger_1.logError)("GetLedgerController: Unhandled error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=getLedger.js.map