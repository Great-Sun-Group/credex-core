import express from "express";
import { CreateAccountService } from "../services/CreateAccount";
import { checkPermittedAccountType } from "../../../constants/accountTypes";
import logger from "../../../../config/logger";
import {
  validateUUID,
  validateAccountName,
  validateAccountHandle,
  validateDenomination,
  validateAmount
} from "../../../utils/validators";

export async function CreateAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const { ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom } = req.body;

  try {
    // Validate input
    if (!validateUUID(ownerID)) {
      res.status(400).json({ message: "Invalid ownerID" });
      return;
    }
    if (!checkPermittedAccountType(accountType)) {
      res.status(400).json({ message: "Invalid accountType" });
      return;
    }
    if (!validateAccountName(accountName)) {
      res.status(400).json({ message: "Invalid accountName" });
      return;
    }
    if (!validateAccountHandle(accountHandle)) {
      res.status(400).json({ message: "Invalid accountHandle" });
      return;
    }
    if (!validateDenomination(defaultDenom)) {
      res.status(400).json({ message: "Invalid defaultDenom" });
      return;
    }
    if (DCOdenom && !validateDenomination(DCOdenom)) {
      res.status(400).json({ message: "Invalid DCOdenom" });
      return;
    }
    if (DCOgiveInCXX && !validateAmount(DCOgiveInCXX)) {
      res.status(400).json({ message: "Invalid DCOgiveInCXX" });
      return;
    }

    logger.info("Creating new account", {
      ownerID,
      accountType,
      accountName,
      accountHandle,
      defaultDenom,
      DCOdenom,
    });

    const newAccount = await CreateAccountService(
      ownerID,
      accountType,
      accountName,
      accountHandle,
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
