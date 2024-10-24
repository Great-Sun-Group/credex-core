import express from "express";
import { UnauthorizeForCompanyService } from "../services/UnauthorizeForAccount";
import logger from "../../../utils/logger";
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
  logger.debug("UnauthorizeForAccountController called", { body: req.body });

  const { memberIDtoBeUnauthorized, accountID } = req.body;

  if (!memberIDtoBeUnauthorized || !accountID) {
    logger.warn("Missing required parameters", { body: req.body });
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const requiredFields = ["memberIDtoBeUnauthorized", "accountID", "ownerID"];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        logger.warn(`Missing required field: ${field}`, { body: req.body });
        res.status(400).json({ message: `${field} is required` });
        return;
      }
    }

    const { memberIDtoBeUnauthorized, accountID, ownerID } = req.body;

    // Validate memberIDtoBeUnauthorized
    if (!validateUUID(memberIDtoBeUnauthorized)) {
      logger.warn("Invalid memberIDtoBeUnauthorized provided", {
        memberIDtoBeUnauthorized,
      });
      res
        .status(400)
        .json({
          message: "Invalid memberIDtoBeUnauthorized. Must be a valid UUID.",
        });
      return;
    }

    // Validate accountID
    if (!validateUUID(accountID)) {
      logger.warn("Invalid accountID provided", { accountID });
      res
        .status(400)
        .json({ message: "Invalid accountID. Must be a valid UUID." });
      return;
    }

    // Validate ownerID
    if (!validateUUID(ownerID)) {
      logger.warn("Invalid ownerID provided", { ownerID });
      res
        .status(400)
        .json({ message: "Invalid ownerID. Must be a valid UUID." });
      return;
    }

    logger.info("Unauthorizing member for account", {
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
    });

    const responseData = await UnauthorizeForCompanyService(
      memberIDtoBeUnauthorized,
      accountID,
      ownerID
    );

    if (!responseData) {
      logger.warn("Failed to unauthorize member for account", {
        memberIDtoBeUnauthorized,
        accountID,
        ownerID,
      });
      res
        .status(400)
        .json({ message: "Failed to unauthorize member for the account" });
      return;
    }

    logger.info("Member unauthorized for account successfully", {
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
    });
    res.status(200).json(responseData);
  } catch (error) {
    logger.error("Error in UnauthorizeForAccountController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoBeUnauthorized: req.body.memberIDtoBeUnauthorized,
      accountID: req.body.accountID,
      ownerID: req.body.ownerID,
    });
    next(error);
  }
}
