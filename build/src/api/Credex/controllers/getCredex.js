"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCredexController = GetCredexController;
const GetCredex_1 = require("../services/GetCredex");
const logger_1 = require("../../../utils/logger");
const validators_1 = require("../../../utils/validators");
/**
 * GetCredexController
 *
 * This controller handles retrieving Credex details.
 * It validates the required fields, calls the GetCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function GetCredexController(req, res) {
    try {
        const { credexID, accountID } = req.query;
        if (!(0, validators_1.validateUUID)(credexID)) {
            (0, logger_1.logError)("GetCredexController: Invalid credexID", new Error(), { credexID });
            return res.status(400).json({ error: "Invalid credexID" });
        }
        if (!(0, validators_1.validateUUID)(accountID)) {
            (0, logger_1.logError)("GetCredexController: Invalid accountID", new Error(), { accountID });
            return res.status(400).json({ error: "Invalid accountID" });
        }
        const responseData = await (0, GetCredex_1.GetCredexService)(credexID, accountID);
        if (!responseData) {
            (0, logger_1.logError)("GetCredexController: Credex not found", new Error(), { credexID, accountID });
            return res.status(404).json({ error: "Credex not found" });
        }
        (0, logger_1.logInfo)("GetCredexController: Credex details retrieved successfully", { credexID, accountID });
        return res.status(200).json(responseData);
    }
    catch (err) {
        (0, logger_1.logError)("GetCredexController: Unhandled error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=getCredex.js.map