"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestRecurringController = RequestRecurringController;
const RequestRecurring_1 = require("../services/RequestRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
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
        // Validate required fields
        const fieldsRequired = [
            "signerMemberID",
            "requestorAccountID",
            "counterpartyAccountID",
            "InitialAmount",
            "Denomination",
            "nextPayDate",
            "daysBetweenPays",
        ];
        for (const field of fieldsRequired) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        // Check denomination validity
        if (!(0, validators_1.validateDenomination)(req.body.Denomination)) {
            return res.status(400).json({ error: "Invalid denomination" });
        }
        // Validate InitialAmount
        if (!(0, validators_1.validateAmount)(req.body.InitialAmount)) {
            return res.status(400).json({ error: "Invalid InitialAmount" });
        }
        // Validate optional parameters
        if (req.body.securedCredex !== undefined && typeof req.body.securedCredex !== 'boolean') {
            return res.status(400).json({ error: "securedCredex must be a boolean" });
        }
        if (req.body.credspan !== undefined) {
            const credspan = Number(req.body.credspan);
            if (isNaN(credspan) || credspan < 7 || credspan > 35) {
                return res.status(400).json({ error: "credspan must be a number between 7 and 35" });
            }
        }
        if (req.body.remainingPays !== undefined) {
            const remainingPays = Number(req.body.remainingPays);
            if (isNaN(remainingPays) || remainingPays < 0) {
                return res.status(400).json({ error: "remainingPays must be a positive number" });
            }
        }
        // Check securedCredex and credspan relationship
        if (req.body.securedCredex === true && req.body.credspan !== undefined) {
            return res.status(400).json({ error: "credspan must be null when securedCredex is true" });
        }
        if (req.body.securedCredex !== true && req.body.credspan === undefined) {
            return res.status(400).json({ error: "credspan must be provided when securedCredex is not true" });
        }
        const createRecurringData = await (0, RequestRecurring_1.RequestRecurringService)(req.body);
        if (!createRecurringData) {
            return res.status(400).json({ error: "Failed to create recurring payment" });
        }
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(req.body.signerMemberID, req.body.requestorAccountID);
        if (!dashboardData) {
            return res.status(404).json({ error: "Failed to fetch dashboard data" });
        }
        return res.status(200).json({
            avatarMemberID: createRecurringData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        console.error("Error in RequestRecurringController:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=requestRecurring.js.map