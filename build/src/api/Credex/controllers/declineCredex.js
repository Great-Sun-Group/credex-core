"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclineCredexController = DeclineCredexController;
const DeclineCredex_1 = require("../services/DeclineCredex");
const logger_1 = require("../../../utils/logger");
const validators_1 = require("../../../utils/validators");
/**
 * DeclineCredexController
 *
 * This controller handles the declining of Credex offers.
 * It validates the required fields, calls the DeclineCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function DeclineCredexController(req, res) {
    try {
        const { credexID, signerID } = req.body;
        if (!(0, validators_1.validateUUID)(credexID)) {
            (0, logger_1.logError)("DeclineCredexController: Invalid credexID", new Error(), { credexID });
            return res.status(400).json({ error: "Invalid credexID" });
        }
        if (!(0, validators_1.validateUUID)(signerID)) {
            (0, logger_1.logError)("DeclineCredexController: Invalid signerID", new Error(), { signerID });
            return res.status(400).json({ error: "Invalid signerID" });
        }
        const responseData = await (0, DeclineCredex_1.DeclineCredexService)(credexID, signerID);
        if (!responseData) {
            (0, logger_1.logError)("DeclineCredexController: Failed to decline Credex", new Error(), { credexID });
            return res.status(404).json({ error: "Credex not found or already processed" });
        }
        (0, logger_1.logInfo)("DeclineCredexController: Credex declined successfully", { credexID });
        return res.status(200).json({ message: "Credex declined successfully", data: responseData });
    }
    catch (err) {
        (0, logger_1.logError)("DeclineCredexController: Unhandled error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=declineCredex.js.map