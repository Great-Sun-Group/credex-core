"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptCredexBulkController = AcceptCredexBulkController;
const AcceptCredex_1 = require("../services/AcceptCredex");
const getAccountDashboard_1 = require("../../Account/controllers/getAccountDashboard");
const validators_1 = require("../../../utils/validators");
async function AcceptCredexBulkController(req, res) {
    const fieldsRequired = ["credexIDs", "signerID"];
    for (const field of fieldsRequired) {
        if (!req.body[field]) {
            return res
                .status(400)
                .json({ message: `${field} is required` })
                .send();
        }
    }
    if (!Array.isArray(req.body.credexIDs) ||
        !req.body.credexIDs.every((id) => typeof id === "string" && (0, validators_1.validateUUID)(id))) {
        return res
            .status(400)
            .json({ message: "Array of valid credexIDs (UUIDs) to accept is required" });
    }
    if (!(0, validators_1.validateUUID)(req.body.signerID)) {
        return res
            .status(400)
            .json({ message: "Invalid signerID. Must be a valid UUID." });
    }
    try {
        const acceptCredexData = await Promise.all(req.body.credexIDs.map(async (credexID) => {
            const data = await (0, AcceptCredex_1.AcceptCredexService)(credexID, req.body.signerID);
            if (data) {
                return data;
            }
            return null;
        }));
        // Filter out any null values
        const validCredexData = acceptCredexData.filter((item) => item !== null);
        if (validCredexData.length > 0) {
            // Assuming that memberID and acceptorAccountID are the same for all returned objects
            const { memberID, acceptorAccountID } = validCredexData[0];
            const dashboardReq = {
                body: {
                    memberID,
                    accountID: acceptorAccountID
                }
            };
            const dashboardRes = {
                status: (code) => ({
                    json: (data) => data
                })
            };
            const dashboardData = await (0, getAccountDashboard_1.GetAccountDashboardController)(dashboardReq, dashboardRes);
            res.json({
                acceptCredexData: validCredexData,
                dashboardData: dashboardData,
            });
        }
        else {
            // Handle the case when there are no valid data returned from AcceptCredexService
            res
                .status(400)
                .json({ error: "No valid data returned from AcceptCredexService" });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
//# sourceMappingURL=acceptCredexBulk.js.map