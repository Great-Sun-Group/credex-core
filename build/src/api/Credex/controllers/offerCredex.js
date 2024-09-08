"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferCredexController = OfferCredexController;
const OfferCredex_1 = require("../services/OfferCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const credspan_1 = require("../../../constants/credspan");
const securedCredexAuthForTier_1 = require("../../Member/controllers/securedCredexAuthForTier");
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = require("../../../utils/logger");
const joi_1 = __importDefault(require("joi"));
const offerCredexSchema = joi_1.default.object({
    memberID: joi_1.default.string().uuid().required(),
    issuerAccountID: joi_1.default.string().uuid().required(),
    receiverAccountID: joi_1.default.string().uuid().required(),
    Denomination: joi_1.default.string().required(),
    InitialAmount: joi_1.default.number().positive().required(),
    credexType: joi_1.default.string().required(),
    OFFERSorREQUESTS: joi_1.default.string().valid("OFFERS", "REQUESTS").required(),
    securedCredex: joi_1.default.boolean().default(false),
    dueDate: joi_1.default.when("securedCredex", {
        is: false,
        then: joi_1.default.date().iso().required(),
        otherwise: joi_1.default.forbidden()
    })
});
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
        // Validate input using Joi
        const { error, value } = offerCredexSchema.validate(req.body);
        if (error) {
            (0, logger_1.logError)("OfferCredexController input validation failed", error);
            return res.status(400).json({ error: error.details[0].message });
        }
        const { memberID, issuerAccountID, receiverAccountID, Denomination, InitialAmount, credexType, OFFERSorREQUESTS, securedCredex, dueDate } = value;
        // Check if issuerAccountID and receiverAccountID are the same
        if (issuerAccountID === receiverAccountID) {
            (0, logger_1.logError)("OfferCredexController: Issuer and receiver are the same account", new Error(), { issuerAccountID, receiverAccountID });
            return res.status(400).json({ error: "Issuer and receiver cannot be the same account" });
        }
        // Check due date for unsecured credex
        if (!securedCredex) {
            const dueDateOK = await (0, credspan_1.checkDueDate)(dueDate);
            if (!dueDateOK) {
                (0, logger_1.logError)("OfferCredexController: Invalid due date", new Error(), { dueDate });
                return res.status(400).json({
                    error: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan_1.credspan / 7} weeks from today.`
                });
            }
        }
        // Check secured credex limits based on membership tier
        if (securedCredex) {
            const getMemberTier = await ledgerSpaceSession.run(`
          MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
          RETURN member.memberTier as memberTier
        `, { issuerAccountID });
            const memberTier = getMemberTier.records[0]?.get("memberTier");
            if (!memberTier) {
                (0, logger_1.logError)("OfferCredexController: Member tier not found", new Error(), { issuerAccountID });
                return res.status(404).json({ error: "Member tier not found" });
            }
            const tierAuth = await (0, securedCredexAuthForTier_1.SecuredCredexAuthForTierController)(issuerAccountID, memberTier, InitialAmount, Denomination);
            if (!tierAuth.isAuthorized) {
                (0, logger_1.logError)("OfferCredexController: Unauthorized secured credex", new Error(), { issuerAccountID, memberTier, InitialAmount, Denomination });
                return res.status(400).json({ error: tierAuth.message });
            }
        }
        // Check if unsecured credex is permitted on membership tier
        if (!securedCredex) {
            const getMemberTier = await ledgerSpaceSession.run(`
          MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
          RETURN member.memberTier as memberTier
        `, { issuerAccountID });
            const memberTier = getMemberTier.records[0]?.get("memberTier");
            if (!memberTier) {
                (0, logger_1.logError)("OfferCredexController: Member tier not found", new Error(), { issuerAccountID });
                return res.status(404).json({ error: "Member tier not found" });
            }
            if (memberTier == 1) {
                (0, logger_1.logError)("OfferCredexController: Unauthorized unsecured credex for Open Tier", new Error(), { issuerAccountID, memberTier });
                return res.status(400).json({ error: "Members on the Open Tier cannot issue unsecured credexes" });
            }
        }
        // Call OfferCredexService to create the Credex offer
        const offerCredexData = await (0, OfferCredex_1.OfferCredexService)(value);
        if (!offerCredexData || typeof offerCredexData.credex === 'boolean') {
            (0, logger_1.logError)("OfferCredexController: Failed to create Credex offer", new Error(), { offerCredexData });
            return res.status(400).json({ error: offerCredexData.message || "Failed to create Credex offer" });
        }
        // Fetch updated dashboard data
        const dashboardData = await (0, GetAccountDashboard_1.GetAccountDashboardService)(memberID, issuerAccountID);
        if (!dashboardData) {
            (0, logger_1.logError)("OfferCredexController: Failed to fetch dashboard data", new Error(), { memberID, issuerAccountID });
            return res.status(404).json({ error: "Failed to fetch dashboard data" });
        }
        // Log successful Credex offer
        (0, logger_1.logInfo)("OfferCredexController: Credex offer created successfully", { credexID: offerCredexData.credex.credexID });
        // Return the offer data and updated dashboard data
        return res.status(200).json({
            offerCredexData: offerCredexData,
            dashboardData: dashboardData,
        });
    }
    catch (err) {
        (0, logger_1.logError)("OfferCredexController: Unhandled error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=offerCredex.js.map