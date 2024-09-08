import express from "express";
import { GetLedgerService } from "../services/GetLedger";
import { validateUUID, validatePositiveInteger } from "../../../utils/validators";
import logger from "../../../../config/logger";

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
  const requestId = req.id;
  logger.debug('Entering GetLedgerController', { requestId });

  try {
    const { accountID, numRows, startRow } = req.query;
    logger.debug('Received get ledger request', { requestId, accountID, numRows, startRow });

    if (!validateUUID(accountID as string)) {
      logger.warn("Invalid accountID", { accountID, requestId });
      return res.status(400).json({ error: "Invalid accountID" });
    }

    const parsedNumRows = numRows ? parseInt(numRows as string, 10) : 10;
    const parsedStartRow = startRow ? parseInt(startRow as string, 10) : 0;

    if (!validatePositiveInteger(parsedNumRows)) {
      logger.warn("Invalid numRows", { numRows, requestId });
      return res.status(400).json({ error: "Invalid numRows. Must be a positive integer." });
    }

    if (!Number.isInteger(parsedStartRow) || parsedStartRow < 0) {
      logger.warn("Invalid startRow", { startRow, requestId });
      return res.status(400).json({ error: "Invalid startRow. Must be a non-negative integer." });
    }

    logger.debug('Calling GetLedgerService', { requestId, accountID, numRows: parsedNumRows, startRow: parsedStartRow });
    const responseData = await GetLedgerService(accountID as string, parsedNumRows, parsedStartRow);
    
    if (!responseData) {
      logger.warn("Failed to retrieve ledger", { accountID, numRows: parsedNumRows, startRow: parsedStartRow, requestId });
      return res.status(404).json({ error: "Failed to retrieve ledger" });
    }

    logger.info("Ledger retrieved successfully", { accountID, numRows: parsedNumRows, startRow: parsedStartRow, requestId });
    logger.debug('Exiting GetLedgerController with success', { requestId });
    return res.status(200).json(responseData);
  } catch (err) {
    logger.error("Unhandled error in GetLedgerController", { error: (err as Error).message, stack: (err as Error).stack, requestId });
    logger.debug('Exiting GetLedgerController with error', { requestId });
    return res.status(500).json({ error: "Internal server error" });
  }
}
