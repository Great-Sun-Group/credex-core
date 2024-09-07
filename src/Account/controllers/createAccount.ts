import express from "express";
import { CreateAccountService } from "../services/CreateAccount";
import { getDenominations } from "../../Core/constants/denominations";
import { checkPermittedAccountType } from "../../Core/constants/accountTypes";
import logger from "../../../config/logger";

/**
 * Controller for creating a new account
 * @param req - Express request object
 * @param res - Express response object
 */
export async function CreateAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const fieldsRequired = [
    "ownerID",
    "accountType",
    "accountName",
    "accountHandle",
    "defaultDenom",
  ];

  try {
    // Validate required fields
    for (const field of fieldsRequired) {
      if (!req.body[field]) {
        res.status(400).json({ message: `${field} is required` });
        return;
      }
    }

    const { ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom } = req.body;

    // Validate defaultDenom
    if (!getDenominations({ code: defaultDenom }).length) {
      res.status(400).json({ message: "defaultDenom not in denoms" });
      return;
    }

    // Validate accountType
    if (!checkPermittedAccountType(accountType)) {
      res.status(400).json({ message: "accountType not permitted" });
      return;
    }

    // Validate and transform accountHandle
    const transformedAccountHandle = accountHandle.toLowerCase().replace(/\s/g, "");
    if (!/^[a-z0-9._]{3,30}$/.test(transformedAccountHandle)) {
      res.status(400).json({
        message: "Invalid account handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.",
      });
      return;
    }

    // Validate accountName length
    if (accountName.length < 4 || accountName.length > 30) {
      res.status(400).json({ message: "accountName must be between 4 and 30 characters" });
      return;
    }

    // Validate DCOdenom if provided
    if (DCOdenom && !getDenominations({ code: DCOdenom }).length) {
      res.status(400).json({ message: "DCOdenom not in denoms" });
      return;
    }

    // Validate DCOgiveInCXX if provided
    if (DCOgiveInCXX && (isNaN(DCOgiveInCXX) || DCOgiveInCXX < 0)) {
      res.status(400).json({ message: "DCOgiveInCXX must be a non-negative number" });
      return;
    }

    logger.info("Creating new account", {
      ownerID,
      accountType,
      accountName,
      accountHandle: transformedAccountHandle,
      defaultDenom,
      DCOdenom,
    });

    const newAccount = await CreateAccountService(
      ownerID,
      accountType,
      accountName,
      transformedAccountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom
    );

    if (newAccount.accountID) {
      logger.info("Account created successfully", { accountID: newAccount.accountID });
      res.status(201).json({ accountID: newAccount.accountID, message: "Account created successfully" });
    } else {
      res.status(400).json({ message: newAccount.message || "Failed to create account" });
    }
  } catch (error) {
    logger.error("Error in CreateAccountController", { error });
    next(error);
  }
}
