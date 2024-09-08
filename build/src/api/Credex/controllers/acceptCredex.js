"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptCredexController = AcceptCredexController;
const AcceptCredex_1 = require("../services/AcceptCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = require("../../../utils/logger");
const joi_1 = __importDefault(require("joi"));
const acceptCredexSchema = joi_1.default.object({
    credexID: joi_1.default.string().uuid().required(),
    signerID: joi_1.default.string().uuid().required()
});
/**
 * AcceptCredexController
 *
 * This controller handles the acceptance of Credex offers.
 * It validates the required fields, calls the AcceptCredexService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function AcceptCredexController(req, res) {
    try {
        // Validate input using Joi
        const { error, value } = acceptCredexSchema.validate(req.body);
        if (error) {
            (0, logger_1.logError)("AcceptCredexController input validation failed", error);
            return res.status(400).json({ error: error.details[0].message });
        }
        const { credexID, signerID } = value;
        const acceptCredexData = await (0, AcceptCredex_1.AcceptCredexService)(credexID, signerID);
        if (!acceptCredexData) {
            (0, logger_1.logError)("AcceptCredexController: Failed to accept Credex", new Error(), { credexID, signerID });
            return res.status(400).json({ error: "Failed to accept Credex" });
        }
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(signerID, acceptCredexData.acceptorAccountID);
        if (!dashboardData) {
            (0, logger_1.logError)("AcceptCredexController: Failed to fetch dashboard data", new Error(), { signerID, acceptorAccountID: acceptCredexData.acceptorAccountID });
            return res.status(404).json({ error: "Failed to fetch dashboard data" });
        }
        (0, logger_1.logInfo)("AcceptCredexController: Credex accepted successfully", { credexID, signerID });
        return res.status(200).json({
            acceptCredexData: acceptCredexData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        (0, logger_1.logError)("AcceptCredexController: Unhandled error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=acceptCredex.js.map