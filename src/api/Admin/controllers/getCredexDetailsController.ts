import express from "express";
import GetCredexService from "../services/GetCredexService";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

export async function getCredexDetailsController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  logger.debug("getCredexDetails controller called", { body: req.query });
  
  const credexID = req.query.credexID as string;

  try {
    // Validate input
    if (!validateUUID(credexID)) {
      logger.warn("Invalid credexID provided", { credexID });
      return res.status(400).json({ message: "Invalid credexID" });
    }

    logger.info("Fetching credex details", { credexID });

    const result = await GetCredexService(credexID);

    if (!result) {
      logger.warn("Credex not found", { credexID });
      return res.status(404).json({ message: "Credex not found" });
    }

    logger.info("Credex details retrieved successfully", { credexID });
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error in getCredexDetails controller", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
    });
    next(error);
  }
}
