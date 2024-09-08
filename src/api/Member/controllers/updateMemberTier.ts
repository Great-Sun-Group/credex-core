import express from "express";
import { UpdateMemberTierService } from "../services/UpdateMemberTier";
import logger from "../../../../config/logger";
import { validateUUID, validateTier } from "../../../utils/validators";

/**
 * Controller for updating a member's tier
 * @param memberID - ID of the member
 * @param tier - New tier for the member
 * @returns Object containing success status and message
 */
export async function UpdateMemberTierController(
  memberID: string,
  tier: number
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info("Updating member tier", { memberID, tier });

    const result = await UpdateMemberTierService(memberID, tier);
    if (result) {
      logger.info("Member tier updated successfully", { memberID, tier });
      return { success: true, message: "Member tier updated successfully" };
    } else {
      logger.warn("Failed to update member tier", { memberID, tier });
      return { success: false, message: "Failed to update member tier" };
    }
  } catch (error) {
    logger.error("Error in UpdateMemberTierController", { error, memberID, tier });
    return { success: false, message: "Internal Server Error" };
  }
}

/**
 * Express middleware wrapper for updating a member's tier
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function updateMemberTierExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  try {
    const { memberID, tier } = req.body;

    if (!validateUUID(memberID)) {
      res.status(400).json({ message: 'Invalid memberID' });
      return;
    }

    if (!validateTier(tier)) {
      res.status(400).json({ message: 'Invalid tier' });
      return;
    }

    const result = await UpdateMemberTierController(memberID, tier);

    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    logger.error("Error in updateMemberTierExpressHandler", { error, body: req.body });
    next(error);
  }
}
