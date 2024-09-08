"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCredexController = GetCredexController;
const GetCredex_1 = require("../services/GetCredex");
const logger_1 = require("../../../utils/logger");
const joi_1 = __importDefault(require("joi"));
const getCredexSchema = joi_1.default.object({
    credexID: joi_1.default.string().uuid().required(),
    accountID: joi_1.default.string().uuid().required()
});
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
        // Validate input using Joi
        const { error, value } = getCredexSchema.validate(req.query);
        if (error) {
            (0, logger_1.logError)("GetCredexController input validation failed", error);
            return res.status(400).json({ error: error.details[0].message });
        }
        const { credexID, accountID } = value;
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