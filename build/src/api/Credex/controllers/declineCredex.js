"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclineCredexController = DeclineCredexController;
const DeclineCredex_1 = require("../services/DeclineCredex");
const logger_1 = require("../../../utils/logger");
const joi_1 = __importDefault(require("joi"));
const declineCredexSchema = joi_1.default.object({
    credexID: joi_1.default.string().uuid().required()
});
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
        // Validate input using Joi
        const { error, value } = declineCredexSchema.validate(req.body);
        if (error) {
            (0, logger_1.logError)("DeclineCredexController input validation failed", error);
            return res.status(400).json({ error: error.details[0].message });
        }
        const { credexID } = value;
        const responseData = await (0, DeclineCredex_1.DeclineCredexService)(credexID);
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