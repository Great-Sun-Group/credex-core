import express from "express";
import { GetLedgerService } from "../services/GetLedger";
import { logError, logInfo } from "../../../utils/logger";
import { validateUUID, validatePositiveInteger } from "../../../utils/validators";

/**
 * GetLedgerController
 * 
 * This controller handles retrieving the ledger for an account.
 * It validates the required fields, calls the GetLedgerService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function GetLedgerController(
  req: express.Request,
  res: express.Response
) {
  try {
    const { accountID, numRows, startRow } = req.query;

    if (!validateUUID(accountID as string)) {
      logError("GetLedgerController: Invalid accountID", new Error(), { accountID });
      return res.status(400).json({ error: "Invalid accountID" });
    }

    const parsedNumRows = numRows ? parseInt(numRows as string, 10) : 10;
    const parsedStartRow = startRow ? parseInt(startRow as string, 10) : 0;

    if (!validatePositiveInteger(parsedNumRows)) {
      logError("GetLedgerController: Invalid numRows", new Error(), { numRows });
      return res.status(400).json({ error: "Invalid numRows. Must be a positive integer." });
    }

    if (!Number.isInteger(parsedStartRow) || parsedStartRow < 0) {
      logError("GetLedgerController: Invalid startRow", new Error(), { startRow });
      return res.status(400).json({ error: "Invalid startRow. Must be a non-negative integer." });
    }

    const responseData = await GetLedgerService(accountID as string, parsedNumRows, parsedStartRow);
    
    if (!responseData) {
      logError("GetLedgerController: Failed to retrieve ledger", new Error(), { accountID, numRows: parsedNumRows, startRow: parsedStartRow });
      return res.status(404).json({ error: "Failed to retrieve ledger" });
    }

    logInfo("GetLedgerController: Ledger retrieved successfully", { accountID, numRows: parsedNumRows, startRow: parsedStartRow });
    return res.status(200).json(responseData);
  } catch (err) {
    logError("GetLedgerController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
