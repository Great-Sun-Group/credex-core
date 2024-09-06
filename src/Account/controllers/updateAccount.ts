import express from "express";
import { UpdateAccountService } from "../services/UpdateAccount";
import logger from "../../../config/logger";
import { getDenominations } from "../../Core/constants/denominations";

/**
 * Controller for updating an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function UpdateAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requiredFields = ["ownerID", "accountID"];

  try {
    for (const field of requiredFields) {
      if (!req.body[field]) {
        res.status(400).json({ message: `${field} is required` });
        return;
      }
    }

    const { ownerID, accountID, accountName, accountHandle, defaultDenom } = req.body;

    // Validate ownerID
    if (typeof ownerID !== 'string' || !/^[a-f0-9-]{36}$/.test(ownerID)) {
      res.status(400).json({ message: "Invalid ownerID. Must be a valid UUID." });
      return;
    }

    // Validate accountID
    if (typeof accountID !== 'string' || !/^[a-f0-9-]{36}$/.test(accountID)) {
      res.status(400).json({ message: "Invalid accountID. Must be a valid UUID." });
      return;
    }

    // Validate accountName if provided
    if (accountName && (typeof accountName !== 'string' || accountName.length < 3 || accountName.length > 50)) {
      res.status(400).json({ message: "Invalid accountName. Must be a string between 3 and 50 characters." });
      return;
    }

    // Validate accountHandle if provided
    if (accountHandle && (typeof accountHandle !== 'string' || !/^[a-z0-9._]{3,30}$/.test(accountHandle))) {
      res.status(400).json({ message: "Invalid accountHandle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters." });
      return;
    }

    // Validate defaultDenom if provided
    if (defaultDenom && (!getDenominations({ code: defaultDenom }).length)) {
      res.status(400).json({ message: "Invalid defaultDenom. Must be a valid denomination." });
      return;
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
