"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelCredexController = CancelCredexController;
const CancelCredex_1 = require("../services/CancelCredex");
const logger_1 = require("../../../utils/logger");
const joi_1 = __importDefault(require("joi"));
const cancelCredexSchema = joi_1.default.object({
    credexID: joi_1.default.string().uuid().required()
});
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
        // Validate input using Joi
        const { error, value } = cancelCredexSchema.validate(req.body);
        if (error) {
            (0, logger_1.logError)("CancelCredexController input validation failed", error);
            return res.status(400).json({ error: error.details[0].message });
        }
        const { credexID } = value;
        const responseData = await (0, CancelCredex_1.CancelCredexService)(credexID);
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