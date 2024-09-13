import express from "express";
import { UpdateSendOffersToService } from "../services/UpdateSendOffersTo";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

export async function UpdateSendOffersToController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  logger.debug("UpdateSendOffersToController called", { body: req.body });

  const { memberIDtoSendOffers, accountID, ownerID } = req.body;

  try {
    // Validate input
    if (!validateUUID(memberIDtoSendOffers)) {
      logger.warn("Invalid memberIDtoSendOffers provided", {
        memberIDtoSendOffers,
      });
      return res.status(400).json({ message: "Invalid memberIDtoSendOffers" });
    }
    if (!validateUUID(accountID)) {
      logger.warn("Invalid accountID provided", { accountID });
      return res.status(400).json({ message: "Invalid accountID" });
    }
    if (!validateUUID(ownerID)) {
      logger.warn("Invalid ownerID provided", { ownerID });
      return res.status(400).json({ message: "Invalid ownerID" });
    }

    logger.info("Updating offer recipient for account", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });

    const responseData = await UpdateSendOffersToService(
      memberIDtoSendOffers,
      accountID,
      ownerID
    );

    if (!responseData) {
      logger.warn("Failed to update offer recipient for account", {
        memberIDtoSendOffers,
        accountID,
        ownerID,
      });
      res
        .status(400)
        .json({ message: "Failed to update offer recipient for account" });
      return;
    }

    logger.info("Offer recipient updated successfully for account", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });
    res.status(200).json(responseData);
  } catch (error) {
    logger.error("Error in UpdateSendOffersToController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoSendOffers: req.body.memberIDtoSendOffers,
      accountID: req.body.accountID,
      ownerID: req.body.ownerID,
    });
    next(error);
  }
}
