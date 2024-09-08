import express from "express";
import { CancelCredexService } from "../services/CancelCredex";
import { logError, logInfo } from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

/**
 * CancelCredexController
 * 
 * This controller handles the cancellation of Credex offers.
 * It validates the required fields, calls the CancelCredexService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function CancelCredexController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  
  try {
    const { credexID, signerID } = req.body;

    if (!validateUUID(credexID)) {
      logError("CancelCredexController: Invalid credexID", new Error(), { credexID, requestId });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    if (!validateUUID(signerID)) {
      logError("CancelCredexController: Invalid signerID", new Error(), { signerID, requestId });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    const responseData = await CancelCredexService(credexID, signerID, requestId);
    
    if (!responseData) {
      logError("CancelCredexController: Credex not found or already processed", new Error(), { credexID, requestId });
      return res.status(404).json({ error: "Credex not found or already processed" });
    }

    logInfo("CancelCredexController: Credex cancelled successfully", { credexID, requestId });
    return res.status(200).json({ message: "Credex cancelled successfully", credexID: responseData });
  } catch (err) {
    logError("CancelCredexController: Unhandled error", err as Error, { requestId });
    return res.status(500).json({ error: "Internal server error" });
  }
}
