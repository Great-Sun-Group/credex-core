"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelCredexController = CancelCredexController;
const CancelCredex_1 = require("../services/CancelCredex");
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
        // Validate required fields
        if (!req.body.credexID) {
            return res.status(400).json({ error: "credexID is required" });
        }
        const responseData = await (0, CancelCredex_1.CancelCredexService)(req.body.credexID);
        if (!responseData) {
            return res.status(404).json({ error: "Credex not found or already processed" });
        }
        return res.status(200).json({ message: "Credex cancelled successfully", credexID: responseData });
    }
    catch (err) {
        console.error("Error in CancelCredexController:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=cancelCredex.js.map