"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestRecurringController = RequestRecurringController;
const RequestRecurring_1 = require("../services/RequestRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
/**
 * RequestRecurringController
 *
 * This controller handles the creation of recurring payment requests.
 * It validates the input, calls the RequestRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function RequestRecurringController(req, res) {
    try {
        const { signerMemberID, requestorAccountID, counterpartyAccountID, InitialAmount, Denomination, nextPayDate, daysBetweenPays, securedCredex, credspan, remainingPays } = req.body;
        if (!(0, validators_1.validateUUID)(signerMemberID)) {
            return res.status(400).json({ error: "Invalid signerMemberID" });
        }
        if (!(0, validators_1.validateUUID)(requestorAccountID)) {
            return res.status(400).json({ error: "Invalid requestorAccountID" });
        }
        if (!(0, validators_1.validateUUID)(counterpartyAccountID)) {
            return res.status(400).json({ error: "Invalid counterpartyAccountID" });
        }
        if (!(0, validators_1.validateAmount)(InitialAmount)) {
            return res.status(400).json({ error: "Invalid InitialAmount" });
        }
        if (!(0, validators_1.validateDenomination)(Denomination)) {
            return res.status(400).json({ error: "Invalid Denomination" });
        }
        if (isNaN(Date.parse(nextPayDate))) {
            return res.status(400).json({ error: "Invalid nextPayDate" });
        }
        if (!(0, validators_1.validatePositiveInteger)(daysBetweenPays)) {
            return res.status(400).json({ error: "Invalid daysBetweenPays" });
        }
        if (securedCredex === true && credspan !== undefined) {
            return res.status(400).json({ error: "credspan is not allowed when securedCredex is true" });
        }
        if (securedCredex === false && (credspan === undefined || credspan < 7 || credspan > 35)) {
            return res.status(400).json({ error: "credspan must be between 7 and 35 when securedCredex is false" });
        }
        if (remainingPays !== undefined && !(0, validators_1.validatePositiveInteger)(remainingPays)) {
            return res.status(400).json({ error: "Invalid remainingPays" });
        }
        const createRecurringData = await (0, RequestRecurring_1.RequestRecurringService)(req.body);
        if (!createRecurringData) {
            logger_1.default.error("Failed to create recurring payment", { error: "RequestRecurringService returned null" });
            return res.status(500).json({ error: "Failed to create recurring payment" });
        }
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(signerMemberID, requestorAccountID);
        if (!dashboardData) {
            logger_1.default.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null" });
            return res.status(500).json({ error: "Failed to fetch dashboard data" });
        }
        logger_1.default.info("Recurring payment requested successfully", { avatarMemberID: createRecurringData });
        return res.status(200).json({
            avatarMemberID: createRecurringData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        logger_1.default.error("Error in RequestRecurringController", { error: err.message });
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=requestRecurring.js.map