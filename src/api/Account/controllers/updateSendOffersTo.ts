import express from "express";
import { UpdateSendOffersToService } from "../services/UpdateSendOffersTo";
import logger from "../../../../config/logger";

/**
 * Controller for updating the recipient of offers for an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function UpdateSendOffersToController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requiredFields = ["memberIDtoSendOffers", "accountID", "ownerID"];

  try {
    for (const field of requiredFields) {
      if (!req.body[field]) {
        res.status(400).json({ message: `${field} is required` });
        return;
      }
    }

    const { memberIDtoSendOffers, accountID, ownerID } = req.body;

    // Validate memberIDtoSendOffers
    if (typeof memberIDtoSendOffers !== 'string' || !/^[a-f0-9-]{36}$/.test(memberIDtoSendOffers)) {
      res.status(400).json({ message: "Invalid memberIDtoSendOffers. Must be a valid UUID." });
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

    logger.info("Updating offer recipient for account", { memberIDtoSendOffers, accountID, ownerID });

    const responseData = await UpdateSendOffersToService(
      memberIDtoSendOffers,
      accountID,
      ownerID
    );

    if (!responseData) {
      logger.warn("Failed to update offer recipient for account", { memberIDtoSendOffers, accountID, ownerID });
      res.status(400).json({ message: "Failed to update offer recipient for account" });
      return;
    }

    logger.info("Offer recipient updated successfully for account", { memberIDtoSendOffers, accountID, ownerID });
    res.status(200).json(responseData);
  } catch (error) {
    logger.error("Error in UpdateSendOffersToController", { error, memberIDtoSendOffers: req.body.memberIDtoSendOffers, accountID: req.body.accountID, ownerID: req.body.ownerID });
    next(error);
  }
}
