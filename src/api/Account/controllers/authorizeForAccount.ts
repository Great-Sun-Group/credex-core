import express from "express";
import { AuthorizeForAccountService } from "../services/AuthorizeForAccount";
import logger from "../../../../config/logger";

/**
 * Controller for authorizing a member for an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function AuthorizeForAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requiredFields = ["memberHandleToBeAuthorized", "accountID", "ownerID"];

  try {
    for (const field of requiredFields) {
      if (!req.body[field]) {
        res.status(400).json({ message: `${field} is required` });
        return;
      }
    }

    const { memberHandleToBeAuthorized, accountID, ownerID } = req.body;

    // Validate memberHandleToBeAuthorized
    if (typeof memberHandleToBeAuthorized !== 'string' || !/^[a-z0-9._]{3,30}$/.test(memberHandleToBeAuthorized)) {
      res.status(400).json({ message: "Invalid memberHandleToBeAuthorized. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters." });
      return;
    }

    // Validate accountID
    if (typeof accountID !== 'string' || !/^[a-f0-9-]{36}$/.test(accountID)) {
      res.status(400).json({ message: "Invalid accountID. Must be a valid UUID." });
      return;
    }

    // Validate ownerID
    if (typeof ownerID !== 'string' || !/^[a-f0-9-]{36}$/.test(ownerID)) {
      res.status(400).json({ message: "Invalid ownerID. Must be a valid UUID." });
      return;
    }

    logger.info("Authorizing member for account", { memberHandleToBeAuthorized, accountID, ownerID });

    const responseData = await AuthorizeForAccountService(
      memberHandleToBeAuthorized,
      accountID,
      ownerID
    );

    if (!responseData) {
      logger.warn("Failed to authorize member for account", { memberHandleToBeAuthorized, accountID, ownerID });
      res.status(400).json({ message: "Failed to authorize member for account" });
      return;
    }

    if (responseData.message === "accounts not found") {
      logger.warn("Accounts not found during authorization", { memberHandleToBeAuthorized, accountID, ownerID });
      res.status(404).json({ message: "Accounts not found" });
      return;
    }

    if (responseData.message === "Limit of 5 authorized accounts reached. Remove an authorized account if you want to add another.") {
      logger.warn("Authorization limit reached", { memberHandleToBeAuthorized, accountID, ownerID });
      res.status(400).json({ message: responseData.message });
      return;
    }

    if (responseData.message === "You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above.") {
      logger.warn("Insufficient tier for authorization", { memberHandleToBeAuthorized, accountID, ownerID });
      res.status(403).json({ message: responseData.message });
      return;
    }

    logger.info("Member authorized for account successfully", { memberHandleToBeAuthorized, accountID, ownerID });
    res.status(200).json(responseData);
  } catch (error) {
    logger.error("Error in AuthorizeForAccountController", { error, memberHandleToBeAuthorized: req.body.memberHandleToBeAuthorized, accountID: req.body.accountID, ownerID: req.body.ownerID });
    next(error);
  }
}
