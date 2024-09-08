import express from "express";
import { UpdateAccountService } from "../services/UpdateAccount";
import logger from "../../../../config/logger";
import { validateUUID, validateAccountName, validateAccountHandle, validateDenomination } from "../../../utils/validators";

export async function UpdateAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  logger.debug("UpdateAccountController called", { body: req.body });

  const { ownerID, accountID, accountName, accountHandle, defaultDenom } = req.body;

  try {
    // Validate input
    if (!validateUUID(ownerID)) {
      logger.warn("Invalid ownerID provided", { ownerID });
      return res.status(400).json({ message: "Invalid ownerID" });
    }
    if (!validateUUID(accountID)) {
      logger.warn("Invalid accountID provided", { accountID });
      return res.status(400).json({ message: "Invalid accountID" });
    }
    if (accountName && !validateAccountName(accountName)) {
      logger.warn("Invalid accountName provided", { accountName });
      return res.status(400).json({ message: "Invalid accountName" });
    }
    if (accountHandle && !validateAccountHandle(accountHandle)) {
      logger.warn("Invalid accountHandle provided", { accountHandle });
      return res.status(400).json({ message: "Invalid accountHandle" });
    }
    if (defaultDenom && !validateDenomination(defaultDenom)) {
      logger.warn("Invalid defaultDenom provided", { defaultDenom });
      return res.status(400).json({ message: "Invalid defaultDenom" });
    }

    logger.info("Updating account", { ownerID, accountID, accountName, accountHandle, defaultDenom });

    const updatedAccountID = await UpdateAccountService(
      ownerID,
      accountID,
      accountName,
      accountHandle,
      defaultDenom
    );

    if (updatedAccountID) {
      logger.info("Account updated successfully", { updatedAccountID, ownerID, accountID });
      res.status(200).json({ message: `Account updated successfully`, accountID: updatedAccountID });
    } else {
      logger.warn("Account not found or no update performed", { ownerID, accountID });
      res.status(404).json({ message: "Account not found or no update performed" });
    }
  } catch (error) {
    logger.error("Error in UpdateAccountController", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ownerID, 
      accountID 
    });
    next(error);
  }
}
