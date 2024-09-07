import express from "express";
import { UpdateSendOffersToService } from "../services/UpdateSendOffersTo";
import logger from "../../../../config/logger";
import { validateUUID } from "../../../utils/validators";

export async function UpdateSendOffersToController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const { memberIDtoSendOffers, accountID, ownerID } = req.body;

  try {
    // Validate input
    if (!validateUUID(memberIDtoSendOffers)) {
      return res.status(400).json({ message: "Invalid memberIDtoSendOffers" });
    }
    if (!validateUUID(accountID)) {
      return res.status(400).json({ message: "Invalid accountID" });
    }
    if (!validateUUID(ownerID)) {
      return res.status(400).json({ message: "Invalid ownerID" });
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
