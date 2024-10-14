import { Request, Response } from "express";
import { SetDCOparticipantRate } from "../services/SetDCOparticipantRate";
import logger from "../../../utils/logger";

export const setDCOparticipantRateExpressHandler = async (req: Request, res: Response) => {
  logger.info("setDCOparticipantRateExpressHandler called", { path: req.path });

  try {
    const { memberID, personalAccountID, DCOgiveInCXX, DCOdenom } = req.body;

    const result = await SetDCOparticipantRate(memberID, personalAccountID, DCOgiveInCXX, DCOdenom);

    if (result.success) {
      logger.info("DCO participant rate set successfully", { memberID, personalAccountID });
      res.status(200).json({ message: "DCO participant rate set successfully", data: result.data });
    } else {
      logger.error("Failed to set DCO participant rate", { error: result.error, memberID, personalAccountID });
      res.status(400).json({ message: "Failed to set DCO participant rate", error: result.error });
    }
  } catch (error) {
    logger.error("Error in setDCOparticipantRateExpressHandler", { error: (error as Error).message });
    res.status(500).json({ message: "Internal server error", error: (error as Error).message });
  }
};
