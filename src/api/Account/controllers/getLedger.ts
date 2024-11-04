import express from "express";
import { GetLedgerService } from "../services/GetLedger";
import { validateUUID, validatePositiveInteger } from "../../../utils/validators";
import logger from "../../../utils/logger";

export const GetLedgerController = async (
  req: express.Request,
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

    logger.info("Retrieving ledger", { accountID, numRows: parsedNumRows, startRow: parsedStartRow, requestId });

    const responseData = await GetLedgerService(
      accountID,
      parsedNumRows,
      parsedStartRow
    );

    if (responseData) {
      logger.info("Ledger retrieved successfully", {
        accountID,
        numRows: parsedNumRows,
        startRow: parsedStartRow,
        requestId,
      });
      res.status(200).json(responseData);
    } else {
      logger.warn("Ledger not found", { accountID, requestId });
      res.status(404).json({ message: "Ledger not found" });
    }

    logger.debug("Exiting GetLedgerController successfully", { requestId });
  } catch (error) {
    logger.error("Error in GetLedgerController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
      requestId,
    });
    logger.debug("Exiting GetLedgerController with error", { requestId });
    next(error);
  }
};
