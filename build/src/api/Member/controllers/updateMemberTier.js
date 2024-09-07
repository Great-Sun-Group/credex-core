"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMemberTierController = UpdateMemberTierController;
exports.updateMemberTierExpressHandler = updateMemberTierExpressHandler;
const UpdateMemberTier_1 = require("../services/UpdateMemberTier");
const logger_1 = __importDefault(require("../../../../config/logger"));
/**
 * Controller for updating a member's tier
 * @param memberID - ID of the member
 * @param tier - New tier for the member
 * @returns Object containing success status and message
 */
async function UpdateMemberTierController(memberID, tier) {
    try {
        // Input validation
        if (!memberID || typeof memberID !== 'string') {
            return { success: false, message: "Invalid memberID" };
        }
        if (!Number.isInteger(tier) || tier < 1) {
            return { success: false, message: "Invalid tier. Must be a positive integer." };
        }
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
    const { memberID, tier } = req.body;
    try {
        if (!memberID || typeof memberID !== 'string') {
            res.status(400).json({ message: "Invalid memberID. Must be a string." });
            return;
        }
        if (!Number.isInteger(tier) || tier < 1) {
            res.status(400).json({ message: "Invalid tier. Must be a positive integer." });
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
        logger_1.default.error("Error in updateMemberTierExpressHandler", { error, memberID, tier });
        next(error);
    }
}
//# sourceMappingURL=updateMemberTier.js.map