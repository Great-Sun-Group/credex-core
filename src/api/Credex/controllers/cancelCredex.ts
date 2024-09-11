import express from "express";
import { CancelCredexService } from "../services/CancelCredex";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../utils/logger";

/**
 * CancelCredexController
 *
 * This controller handles the cancellation of Credex offers.
 * It validates the required fields, calls the CancelCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function CancelCredexController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("Entering CancelCredexController", { requestId });

  try {
    const { credexID, signerID } = req.body;
    logger.debug("Received cancellation request", {
      requestId,
      credexID,
      signerID,
    });

    if (!validateUUID(credexID)) {
      logger.warn("Invalid credexID", { credexID, requestId });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    if (!validateUUID(signerID)) {
      logger.warn("Invalid signerID", { signerID, requestId });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    logger.debug("Calling CancelCredexService", {
      requestId,
      credexID,
      signerID,
    });
    const responseData = await CancelCredexService(
      credexID,
      signerID,
      requestId
    );

    if (!responseData) {
      logger.warn("Credex not found or already processed", {
        credexID,
        requestId,
      });
      return res
        .status(404)
        .json({ error: "Credex not found or already processed" });
    }

    logger.info("Credex cancelled successfully", { credexID, requestId });
    logger.debug("Exiting CancelCredexController with success", { requestId });
    return res
      .status(200)
      .json({
        message: "Credex cancelled successfully",
        credexID: responseData,
      });
  } catch (err) {
    logger.error("Unhandled error in CancelCredexController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
      requestId,
    });
    logger.debug("Exiting CancelCredexController with error", { requestId });
    return res.status(500).json({ error: "Internal server error" });
  }
}
