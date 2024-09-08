"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecuredCredexAuthForTierController = SecuredCredexAuthForTierController;
exports.securedCredexAuthForTierExpressHandler = securedCredexAuthForTierExpressHandler;
const SecuredCredexAuthForTier_1 = require("../services/SecuredCredexAuthForTier");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
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
    try {
        const { memberID, tier, Amount, Denomination } = req.body;
        if (!(0, validators_1.validateUUID)(memberID)) {
            res.status(400).json({ message: 'Invalid memberID' });
            return;
        }
        if (!(0, validators_1.validateTier)(tier)) {
            res.status(400).json({ message: 'Invalid tier' });
            return;
        }
        if (!(0, validators_1.validateAmount)(Amount)) {
            res.status(400).json({ message: 'Invalid Amount' });
            return;
        }
        if (!(0, validators_1.validateDenomination)(Denomination)) {
            res.status(400).json({ message: 'Invalid Denomination' });
            return;
        }
        const result = await SecuredCredexAuthForTierController(memberID, tier, Amount, Denomination);
        if (result.isAuthorized) {
            res.status(200).json(result);
        }
        else {
            res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.default.error("Error in securedCredexAuthForTierExpressHandler", { error, body: req.body });
        next(error);
    }
}
//# sourceMappingURL=securedCredexAuthForTier.js.map