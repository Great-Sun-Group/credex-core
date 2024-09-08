"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferCredexController = OfferCredexController;
const OfferCredex_1 = require("../services/OfferCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const credspan_1 = require("../../../constants/credspan");
const securedCredexAuthForTier_1 = require("../../Member/controllers/securedCredexAuthForTier");
const neo4j_1 = require("../../../../config/neo4j");
const validators_1 = require("../../../utils/validators");
/**
 * OfferCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates the required fields, performs additional validations,
 * calls the OfferCredexService, and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
async function OfferCredexController(req, res) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        // Validate required fields
        const fieldsRequired = [
            "memberID",
            "issuerAccountID",
            "receiverAccountID",
            "Denomination",
            "InitialAmount",
            "credexType",
            "OFFERSorREQUESTS",
        ];
        for (const field of fieldsRequired) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        const { memberID, issuerAccountID, receiverAccountID, Denomination, InitialAmount, credexType, OFFERSorREQUESTS, securedCredex = false, dueDate = "", } = req.body;
        // Validate UUIDs
        if (!(0, validators_1.validateUUID)(memberID) || !(0, validators_1.validateUUID)(issuerAccountID) || !(0, validators_1.validateUUID)(receiverAccountID)) {
            return res.status(400).json({ error: "Invalid UUID provided" });
        }
        // Check if issuerAccountID and receiverAccountID are the same
        if (issuerAccountID === receiverAccountID) {
            return res.status(400).json({ error: "Issuer and receiver cannot be the same account" });
        }
        // Validate InitialAmount
        if (!(0, validators_1.validateAmount)(InitialAmount)) {
            return res.status(400).json({ error: "Invalid InitialAmount" });
        }
        // Check denomination validity
        if (!(0, validators_1.validateDenomination)(Denomination)) {
            return res.status(400).json({ error: "Invalid denomination" });
        }
        // Check credex type validity
        if (!(0, validators_1.validateCredexType)(credexType)) {
            return res.status(400).json({ error: "Invalid credex type" });
        }
        // Validate OFFERSorREQUESTS
        if (OFFERSorREQUESTS !== "OFFERS" && OFFERSorREQUESTS !== "REQUESTS") {
            return res.status(400).json({ error: "Invalid OFFER/REQUEST value" });
        }
        // Check due date for unsecured credex
        if (!securedCredex) {
            if (!dueDate) {
                return res.status(400).json({ error: "Unsecured credex must have a due date" });
            }
            const dueDateOK = await (0, credspan_1.checkDueDate)(dueDate);
            if (!dueDateOK) {
                return res.status(400).json({
                    error: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan_1.credspan / 7} weeks from today.`
                });
            }
        }
        else if (dueDate) {
            return res.status(400).json({ error: "Secured credex cannot have a due date" });
        }
        // Check secured credex limits based on membership tier
        if (securedCredex) {
            const getMemberTier = await ledgerSpaceSession.run(`
          MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
          RETURN member.memberTier as memberTier
        `, { issuerAccountID });
            const memberTier = getMemberTier.records[0].get("memberTier");
            const tierAuth = await (0, securedCredexAuthForTier_1.SecuredCredexAuthForTierController)(issuerAccountID, memberTier, InitialAmount, Denomination);
            if (!tierAuth.isAuthorized) {
                return res.status(400).json({ error: tierAuth.message });
            }
        }
        // Check if unsecured credex is permitted on membership tier
        if (!securedCredex) {
            const getMemberTier = await ledgerSpaceSession.run(`
          MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
          RETURN member.memberTier as memberTier
        `, { issuerAccountID });
            const memberTier = getMemberTier.records[0].get("memberTier");
            if (memberTier == 1) {
                return res.status(400).json({ error: "Members on the Open Tier cannot issue unsecured credexes" });
            }
        }
        // Call OfferCredexService to create the Credex offer
        const offerCredexData = await (0, OfferCredex_1.OfferCredexService)(req.body);
        if (!offerCredexData || typeof offerCredexData.credex === 'boolean') {
            return res.status(400).json({ error: offerCredexData.message || "Failed to create Credex offer" });
        }
        // Fetch updated dashboard data
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(memberID, issuerAccountID);
        if (!dashboardData) {
            return res.status(404).json({ error: "Failed to fetch dashboard data" });
        }
        // Return the offer data and updated dashboard data
        return res.status(200).json({
            offerCredexData: offerCredexData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        console.error("Error in OfferCredexController:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=offerCredex.js.map