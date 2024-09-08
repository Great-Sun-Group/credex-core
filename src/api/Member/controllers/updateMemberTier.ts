import express from "express";
import { UpdateMemberTierService } from "../services/UpdateMemberTier";
import logger from "../../../../config/logger";
import { updateMemberTierSchema } from "../validators/memberSchemas";

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
    const { error, value } = updateMemberTierSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { memberID, tier } = value;
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
