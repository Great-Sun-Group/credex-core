import express from "express";
import { UnauthorizeForCompanyService } from "../services/UnauthorizeForAccount";
import logger from "../../../../config/logger";
import { validateUUID } from "../../../utils/validators";

/**
 * Controller for unauthorizing a member for an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function UnauthorizeForAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requiredFields = ["memberIDtoBeUnauthorized", "accountID", "ownerID"];

  try {
    for (const field of requiredFields) {
      if (!req.body[field]) {
        res.status(400).json({ message: `${field} is required` });
        return;
      }
    }

    const { memberIDtoBeUnauthorized, accountID, ownerID } = req.body;

    // Validate memberIDtoBeUnauthorized
    if (!validateUUID(memberIDtoBeUnauthorized)) {
      res.status(400).json({ message: "Invalid memberIDtoBeUnauthorized. Must be a valid UUID." });
      return;
    }

    // Validate accountID
    if (!validateUUID(accountID)) {
      res.status(400).json({ message: "Invalid accountID. Must be a valid UUID." });
      return;
    }

    // Validate ownerID
    if (!validateUUID(ownerID)) {
      res.status(400).json({ message: "Invalid ownerID. Must be a valid UUID." });
      return;
    }

    logger.info("Unauthorizing member for account", { memberIDtoBeUnauthorized, accountID, ownerID });

    const responseData = await UnauthorizeForCompanyService(
      memberIDtoBeUnauthorized,
      accountID,
      ownerID
    );

    if (!responseData) {
      logger.warn("Failed to unauthorize member for account", { memberIDtoBeUnauthorized, accountID, ownerID });
      res.status(400).json({ message: "Failed to unauthorize member for the account" });
      return;
    }

    logger.info("Member unauthorized for account successfully", { memberIDtoBeUnauthorized, accountID, ownerID });
    res.status(200).json(responseData);
  } catch (error) {
    logger.error("Error in UnauthorizeForAccountController", { error, memberIDtoBeUnauthorized: req.body.memberIDtoBeUnauthorized, accountID: req.body.accountID, ownerID: req.body.ownerID });
    next(error);
  }
}
