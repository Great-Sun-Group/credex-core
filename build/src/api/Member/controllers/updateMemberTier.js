"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMemberTierController = UpdateMemberTierController;
exports.updateMemberTierExpressHandler = updateMemberTierExpressHandler;
const UpdateMemberTier_1 = require("../services/UpdateMemberTier");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
/**
 * Controller for updating a member's tier
 * @param memberID - ID of the member
 * @param tier - New tier for the member
 * @returns Object containing success status and message
 */
async function UpdateMemberTierController(memberID, tier) {
    try {
        logger_1.default.info("Updating member tier", { memberID, tier });
        const result = await (0, UpdateMemberTier_1.UpdateMemberTierService)(memberID, tier);
        if (result) {
            logger_1.default.info("Member tier updated successfully", { memberID, tier });
            return { success: true, message: "Member tier updated successfully" };
        }
        else {
            logger_1.default.warn("Failed to update member tier", { memberID, tier });
            return { success: false, message: "Failed to update member tier" };
        }
    }
    catch (error) {
        logger_1.default.error("Error in UpdateMemberTierController", { error, memberID, tier });
        return { success: false, message: "Internal Server Error" };
    }
}
/**
 * Express middleware wrapper for updating a member's tier
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function updateMemberTierExpressHandler(req, res, next) {
    try {
        const { memberID, tier } = req.body;
        if (!(0, validators_1.validateUUID)(memberID)) {
            res.status(400).json({ message: 'Invalid memberID' });
            return;
        }
        if (!(0, validators_1.validateTier)(tier)) {
            res.status(400).json({ message: 'Invalid tier' });
            return;
        }
        const result = await UpdateMemberTierController(memberID, tier);
        if (result.success) {
            res.status(200).json({ message: result.message });
        }
        else {
            res.status(400).json({ message: result.message });
        }
    }
    catch (error) {
        logger_1.default.error("Error in updateMemberTierExpressHandler", { error, body: req.body });
        next(error);
    }
}
//# sourceMappingURL=updateMemberTier.js.map