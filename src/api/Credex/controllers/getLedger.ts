import express from "express";
import { GetLedgerService } from "../services/GetLedger";
import { logError, logInfo } from "../../../utils/logger";
import Joi from "joi";

const getLedgerSchema = Joi.object({
  accountID: Joi.string().uuid().required(),
  numRows: Joi.number().integer().min(1).default(10),
  startRow: Joi.number().integer().min(0).default(0)
});

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
    // Validate input using Joi
    const { error, value } = getLedgerSchema.validate(req.query);
    if (error) {
      logError("GetLedgerController input validation failed", error);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { accountID, numRows, startRow } = value;

    const responseData = await GetLedgerService(accountID, numRows, startRow);
    
    if (!responseData) {
      logError("GetLedgerController: Failed to retrieve ledger", new Error(), { accountID, numRows, startRow });
      return res.status(404).json({ error: "Failed to retrieve ledger" });
    }

    logInfo("GetLedgerController: Ledger retrieved successfully", { accountID, numRows, startRow });
    return res.status(200).json(responseData);
  } catch (err) {
    logError("GetLedgerController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
