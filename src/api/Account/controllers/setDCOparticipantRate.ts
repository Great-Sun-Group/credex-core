import { Request, Response, NextFunction } from "express";
import { SetDCOparticipantRate } from "../services/SetDCOparticipantRate";
import logger from "../../../utils/logger";

export async function SetDCOparticipantRateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.debug("SetDCOparticipantRateController called", { body: req.body });

  const { accountID, DCOgiveInCXX, DCOdenom } = req.body;

  try {
    logger.info("Setting DCO participant rate", {
      accountID,
      DCOgiveInCXX,
      DCOdenom
    });

    const result = await SetDCOparticipantRate(
      accountID,
      DCOgiveInCXX,
      DCOdenom
    );

    if (result.accountID) {
      logger.info("DCO participant rate set successfully", {
        accountID: result.accountID
      });
      res.status(200).json({
        accountID: result.accountID,
        message: "DCO participant rate set successfully"
      });
    } else {
      logger.warn("Failed to set DCO participant rate", { message: result.message });
      res.status(400).json({
        message: result.message || "Failed to set DCO participant rate"
      });
    }
  } catch (error) {
    logger.error("Error in SetDCOparticipantRateController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    next(error);
  }
}
