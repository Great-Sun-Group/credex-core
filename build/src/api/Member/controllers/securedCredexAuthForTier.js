"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecuredCredexAuthForTierController = SecuredCredexAuthForTierController;
exports.securedCredexAuthForTierExpressHandler = securedCredexAuthForTierExpressHandler;
const SecuredCredexAuthForTier_1 = require("../services/SecuredCredexAuthForTier");
const logger_1 = __importDefault(require("../../../../config/logger"));
const denominations_1 = require("../../../Core/constants/denominations");
/**
 * Controller for authorizing secured credex for a member's tier
 * @param memberID - ID of the member
 * @param tier - Member's tier
 * @param Amount - Amount for authorization
 * @param Denomination - Denomination for authorization
 * @returns Object containing authorization status and message
 */
async function SecuredCredexAuthForTierController(memberID, tier, Amount, Denomination) {
    try {
        // Input validation
        if (!memberID || typeof memberID !== 'string') {
            return { isAuthorized: false, message: "Invalid memberID" };
        }
        if (!Number.isInteger(tier) || tier < 1) {
            return { isAuthorized: false, message: "Invalid tier" };
        }
        if (typeof Amount !== 'number' || Amount <= 0) {
            return { isAuthorized: false, message: "Invalid Amount" };
        }
        if (!Denomination || typeof Denomination !== 'string' || !(0, denominations_1.getDenominations)({ code: Denomination }).length) {
            return { isAuthorized: false, message: "Invalid Denomination" };
        }
        logger_1.default.info("Authorizing secured credex for tier", { memberID, tier, Amount, Denomination });
        const result = await (0, SecuredCredexAuthForTier_1.SecuredCredexAuthForTier)(memberID, Amount, Denomination);
        if (typeof result === 'string') {
            logger_1.default.warn("Secured credex authorization failed", { memberID, tier, Amount, Denomination, message: result });
            return { isAuthorized: false, message: result };
        }
        else {
            logger_1.default.info("Secured credex authorization successful", { memberID, tier, Amount, Denomination });
            return { isAuthorized: true, message: "Authorization successful" };
        }
    }
    catch (error) {
        logger_1.default.error("Error in SecuredCredexAuthForTierController", { error, memberID, tier, Amount, Denomination });
        return { isAuthorized: false, message: "Internal Server Error" };
    }
}
/**
 * Express middleware wrapper for secured credex authorization
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function securedCredexAuthForTierExpressHandler(req, res, next) {
    const { memberID, tier, Amount, Denomination } = req.body;
    try {
        const result = await SecuredCredexAuthForTierController(memberID, tier, Amount, Denomination);
        if (result.isAuthorized) {
            res.status(200).json(result);
        }
        else {
            res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.default.error("Error in securedCredexAuthForTierExpressHandler", { error, memberID, tier, Amount, Denomination });
        next(error);
    }
}
//# sourceMappingURL=securedCredexAuthForTier.js.map