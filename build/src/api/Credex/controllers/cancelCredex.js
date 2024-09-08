"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelCredexController = CancelCredexController;
const CancelCredex_1 = require("../services/CancelCredex");
const logger_1 = require("../../../utils/logger");
const validators_1 = require("../../../utils/validators");
/**
 * CancelCredexController
 *
 * This controller handles the cancellation of Credex offers.
 * It validates the required fields, calls the CancelCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function CancelCredexController(req, res) {
    try {
        const { credexID, signerID } = req.body;
        if (!(0, validators_1.validateUUID)(credexID)) {
            (0, logger_1.logError)("CancelCredexController: Invalid credexID", new Error(), { credexID });
            return res.status(400).json({ error: "Invalid credexID" });
        }
        if (!(0, validators_1.validateUUID)(signerID)) {
            (0, logger_1.logError)("CancelCredexController: Invalid signerID", new Error(), { signerID });
            return res.status(400).json({ error: "Invalid signerID" });
        }
        const responseData = await (0, CancelCredex_1.CancelCredexService)(credexID, signerID);
        if (!responseData) {
            (0, logger_1.logError)("CancelCredexController: Credex not found or already processed", new Error(), { credexID });
            return res.status(404).json({ error: "Credex not found or already processed" });
        }
        (0, logger_1.logInfo)("CancelCredexController: Credex cancelled successfully", { credexID });
        return res.status(200).json({ message: "Credex cancelled successfully", credexID: responseData });
    }
    catch (err) {
        (0, logger_1.logError)("CancelCredexController: Unhandled error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=cancelCredex.js.map