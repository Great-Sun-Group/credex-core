import express from "express";
import { GetCredexService } from "../services/GetCredex";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../utils/logger";

/**
 * GetCredexController
 *
 * This controller handles retrieving Credex details.
 * It validates the required fields, calls the GetCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function GetCredexController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("Entering GetCredexController", { requestId });

  try {
    const { credexID, accountID } = req.query;
    logger.debug("Received get Credex request", {
      requestId,
      credexID,
      accountID,
    });

    if (!validateUUID(credexID as string)) {
      logger.warn("Invalid credexID", { credexID, requestId });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    if (!validateUUID(accountID as string)) {
      logger.warn("Invalid accountID", { accountID, requestId });
      return res.status(400).json({ error: "Invalid accountID" });
    }

    logger.debug("Calling GetCredexService", {
      requestId,
      credexID,
      accountID,
    });
    const responseData = await GetCredexService(
      credexID as string,
      accountID as string
    );

    if (!responseData) {
      logger.warn("Credex not found", { credexID, accountID, requestId });
      return res.status(404).json({ error: "Credex not found" });
    }

    logger.info("Credex details retrieved successfully", {
      credexID,
      accountID,
      requestId,
    });
    logger.debug("Exiting GetCredexController with success", { requestId });
    return res.status(200).json(responseData);
  } catch (err) {
    logger.error("Unhandled error in GetCredexController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
      requestId,
    });
    logger.debug("Exiting GetCredexController with error", { requestId });
    return res.status(500).json({ error: "Internal server error" });
  }
}
