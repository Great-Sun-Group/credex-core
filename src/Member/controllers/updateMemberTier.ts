import express from "express";
import { UpdateMemberTierService } from "../services/UpdateMemberTier";
import logger from "../../../config/logger";

export async function UpdateMemberTierController(
  memberID: string,
  tier: number
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await UpdateMemberTierService(memberID, tier);
    if (result) {
      return { success: true, message: "Member tier updated successfully" };
    } else {
      return { success: false, message: "Failed to update member tier" };
    }
  } catch (error) {
    logger.error("Error updating member tier:", error);
    return { success: false, message: "Internal Server Error" };
  }
}

// Express middleware wrapper
export async function updateMemberTierExpressHandler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const { memberID, tier } = req.body;

  if (!memberID || typeof tier !== "number") {
    res
      .status(400)
      .json({ message: "Invalid input. memberID and tier are required." });
    return;
  }

  const result = await UpdateMemberTierController(memberID, tier);

  if (result.success) {
    res.status(200).json({ message: result.message });
  } else {
    res.status(400).json({ message: result.message });
  }
}
