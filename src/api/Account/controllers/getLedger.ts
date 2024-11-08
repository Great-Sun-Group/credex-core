import express from "express";
import { GetLedgerService } from "../services/GetLedger";
import { validateUUID, validatePositiveInteger } from "../../../utils/validators";
import logger from "../../../utils/logger";

interface UserRequest extends express.Request {
  user?: any;
}

export const GetLedgerController = async (
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const requestId = req.id;
  const { accountID, numRows, startRow } = req.body;

  logger.debug("Entering GetLedgerController", {
    accountID,
    numRows,
    startRow,
    requestId,
  });

  // Get memberID from authenticated user
  const memberID = req.user?.memberID;
  if (!memberID) {
    logger.warn("No authenticated user found", { requestId });
    res.status(401).json({ message: "Authentication required" });
    logger.debug("Exiting GetLedgerController - no auth", { requestId });
    return;
  }

  try {
    if (!validateUUID(accountID)) {
      logger.warn("Invalid accountID", { accountID, requestId });
      res.status(400).json({
        message: "Invalid accountID",
      });
      logger.debug("Exiting GetLedgerController with invalid accountID", { requestId });
      return;
    }

    const parsedNumRows = numRows ? parseInt(numRows as string, 10) : 10;
    const parsedStartRow = startRow ? parseInt(startRow as string, 10) : 0;

    if (!validatePositiveInteger(parsedNumRows)) {
      logger.warn("Invalid numRows", { numRows, requestId });
      res.status(400).json({
        message: "Invalid numRows. Must be a positive integer.",
      });
      logger.debug("Exiting GetLedgerController with invalid numRows", { requestId });
      return;
    }

    if (!Number.isInteger(parsedStartRow) || parsedStartRow < 0) {
      logger.warn("Invalid startRow", { startRow, requestId });
      res.status(400).json({
        message: "Invalid startRow. Must be a non-negative integer.",
      });
      logger.debug("Exiting GetLedgerController with invalid startRow", { requestId });
      return;
    }

    logger.info("Retrieving ledger", { 
      memberID,
      accountID, 
      numRows: parsedNumRows, 
      startRow: parsedStartRow, 
      requestId 
    });

    const responseData = await GetLedgerService(
      accountID,
      memberID,
      parsedNumRows,
      parsedStartRow
    );

    if (responseData) {
      logger.info("Ledger retrieved successfully", {
        memberID,
        accountID,
        numRows: parsedNumRows,
        startRow: parsedStartRow,
        requestId,
      });
      res.status(200).json({
        success: true,
        data: responseData,
        message: "Ledger retrieved successfully"
      });
    } else {
      logger.warn("Ledger not found", { accountID, requestId });
      res.status(404).json({ 
        success: false,
        message: "Ledger not found" 
      });
    }

    logger.debug("Exiting GetLedgerController successfully", { requestId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized access to account") {
      logger.warn("Unauthorized access attempt", { memberID, accountID, requestId });
      res.status(403).json({
        success: false,
        message: "Unauthorized access to account"
      });
      return;
    }

    logger.error("Error in GetLedgerController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberID,
      accountID,
      requestId,
    });
    logger.debug("Exiting GetLedgerController with error", { requestId });
    next(error);
  }
};
