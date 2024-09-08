import express from "express";
import { UpdateMemberTierService } from "../services/UpdateMemberTier";
import logger from "../../../../config/logger";
import { validateUUID, validateTier } from "../../../utils/validators";

/**
 * Controller for updating a member's tier
 * @param memberID - ID of the member
 * @param tier - New tier for the member
 * @param requestId - Unique identifier for the request
 * @returns Object containing success status and message
 */
export async function UpdateMemberTierController(
  memberID: string,
  tier: number,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  logger.debug("Entering UpdateMemberTierController", { memberID, tier, requestId });

  try {
    logger.info("Updating member tier", { memberID, tier, requestId });

    const result = await UpdateMemberTierService(memberID, tier);
    if (result) {
      logger.info("Member tier updated successfully", { memberID, tier, requestId });
      logger.debug("Exiting UpdateMemberTierController with success", { requestId });
      return { success: true, message: "Member tier updated successfully" };
    } else {
      logger.warn("Failed to update member tier", { memberID, tier, requestId });
      logger.debug("Exiting UpdateMemberTierController with failure", { requestId });
      return { success: false, message: "Failed to update member tier" };
    }
  } catch (error) {
    logger.error("Error in UpdateMemberTierController", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      memberID, 
      tier,
      requestId
    });
    logger.debug("Exiting UpdateMemberTierController with error", { requestId });
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
  const requestId = req.id;
  logger.debug("Entering updateMemberTierExpressHandler", { body: req.body, requestId });

  try {
    const { memberID, tier } = req.body;

    if (!validateUUID(memberID)) {
      logger.warn("Invalid memberID provided", { memberID, requestId });
      res.status(400).json({ message: 'Invalid memberID' });
      logger.debug("Exiting updateMemberTierExpressHandler with invalid memberID", { requestId });
      return;
    }

    if (!validateTier(tier)) {
      logger.warn("Invalid tier provided", { tier, requestId });
      res.status(400).json({ message: 'Invalid tier' });
      logger.debug("Exiting updateMemberTierExpressHandler with invalid tier", { requestId });
      return;
    }

    const result = await UpdateMemberTierController(memberID, tier, requestId);

    if (result.success) {
      logger.info("Member tier update request successful", { memberID, tier, requestId });
      res.status(200).json({ message: result.message });
    } else {
      logger.warn("Member tier update request failed", { memberID, tier, message: result.message, requestId });
      res.status(400).json({ message: result.message });
    }
    logger.debug("Exiting updateMemberTierExpressHandler with result", { success: result.success, requestId });
  } catch (error) {
    logger.error("Error in updateMemberTierExpressHandler", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      requestId
    });
    logger.debug("Exiting updateMemberTierExpressHandler with error", { requestId });
    next(error);
  }
}
