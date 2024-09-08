import express from "express";
import { DeclineCredexService } from "../services/DeclineCredex";
import { logError, logInfo } from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

/**
 * DeclineCredexController
 * 
 * This controller handles the declining of Credex offers.
 * It validates the required fields, calls the DeclineCredexService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function DeclineCredexController(
  req: express.Request,
  res: express.Response
) {
  try {
    const { credexID } = req.body;

    if (!validateUUID(credexID)) {
      logError("DeclineCredexController: Invalid credexID", new Error(), { credexID });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    const responseData = await DeclineCredexService(credexID);
    
    if (!responseData) {
      logError("DeclineCredexController: Failed to decline Credex", new Error(), { credexID });
      return res.status(404).json({ error: "Credex not found or already processed" });
    }

    logInfo("DeclineCredexController: Credex declined successfully", { credexID });
    return res.status(200).json({ message: "Credex declined successfully", data: responseData });
  } catch (err) {
    logError("DeclineCredexController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
