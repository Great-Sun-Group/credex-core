import express from "express";
import { UpdateAccountService } from "../services/UpdateAccount";
import logger from "../../../../config/logger";
import { getDenominations } from "../../../constants/denominations";
import { validateUUID, validateAccountName, validateAccountHandle } from "../../../utils/validators";

export async function UpdateAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const { ownerID, accountID, accountName, accountHandle, defaultDenom } = req.body;

  try {
    // Validate input
    if (!validateUUID(ownerID)) {
      return res.status(400).json({ message: "Invalid ownerID" });
    }
    if (!validateUUID(accountID)) {
      return res.status(400).json({ message: "Invalid accountID" });
    }
    if (accountName && !validateAccountName(accountName)) {
      return res.status(400).json({ message: "Invalid accountName" });
    }
    if (accountHandle && !validateAccountHandle(accountHandle)) {
      return res.status(400).json({ message: "Invalid accountHandle" });
    }
    if (defaultDenom && !getDenominations({ code: defaultDenom }).length) {
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
      logger.info("Account updated successfully", { updatedAccountID });
      res.status(200).json({ message: `Account updated successfully`, accountID: updatedAccountID });
    } else {
      logger.warn("Account not found or no update performed", { ownerID, accountID });
      res.status(404).json({ message: "Account not found or no update performed" });
    }
  } catch (error) {
    logger.error("Error in UpdateAccountController", { error, ownerID: req.body.ownerID, accountID: req.body.accountID });
    next(error);
  }
}
