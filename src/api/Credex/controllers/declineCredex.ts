import express from "express";
import { DeclineCredexService } from "../services/DeclineCredex";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../utils/logger";

/**
 * DeclineCredexController
 *
 * This controller handles the declining of Credex offers.
 * It validates the required fields, calls the DeclineCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function DeclineCredexController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("Entering DeclineCredexController", { requestId });

  try {
    const { credexID, signerID } = req.body;
    logger.debug("Received decline request", { requestId, credexID, signerID });

    if (!validateUUID(credexID)) {
      logger.warn("Invalid credexID", { credexID, requestId });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    if (!validateUUID(signerID)) {
      logger.warn("Invalid signerID", { signerID, requestId });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    logger.debug("Calling DeclineCredexService", {
      requestId,
      credexID,
      signerID,
    });
    const responseData = await DeclineCredexService(
      credexID,
      signerID,
      requestId
    );

    if (!responseData) {
      logger.warn("Failed to decline Credex", { credexID, requestId });
      return res
        .status(404)
        .json({ error: "Credex not found or already processed" });
    }

    logger.info("Credex declined successfully", { credexID, requestId });
    logger.debug("Exiting DeclineCredexController with success", { requestId });
    return res
      .status(200)
      .json({ message: "Credex declined successfully", data: responseData });
  } catch (err) {
    logger.error("Unhandled error in DeclineCredexController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
      requestId,
    });
    logger.debug("Exiting DeclineCredexController with error", { requestId });
    return res.status(500).json({ error: "Internal server error" });
  }
}
