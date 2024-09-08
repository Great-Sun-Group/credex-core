import express from "express";
import { GetCredexService } from "../services/GetCredex";
import { logError, logInfo } from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

/**
 * GetCredexController
 * 
 * This controller handles retrieving Credex details.
 * It validates the required fields, calls the GetCredexService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function GetCredexController(
  req: express.Request,
  res: express.Response
) {
  try {
    const { credexID, accountID } = req.query;

    if (!validateUUID(credexID as string)) {
      logError("GetCredexController: Invalid credexID", new Error(), { credexID });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    if (!validateUUID(accountID as string)) {
      logError("GetCredexController: Invalid accountID", new Error(), { accountID });
      return res.status(400).json({ error: "Invalid accountID" });
    }

    const responseData = await GetCredexService(credexID as string, accountID as string);
    
    if (!responseData) {
      logError("GetCredexController: Credex not found", new Error(), { credexID, accountID });
      return res.status(404).json({ error: "Credex not found" });
    }

    logInfo("GetCredexController: Credex details retrieved successfully", { credexID, accountID });
    return res.status(200).json(responseData);
  } catch (err) {
    logError("GetCredexController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
