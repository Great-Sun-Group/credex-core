import express from "express";
import { CancelCredexService } from "../services/CancelCredex";
import { logError, logInfo } from "../../../utils/logger";
import Joi from "joi";

const cancelCredexSchema = Joi.object({
  credexID: Joi.string().uuid().required()
});

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
  try {
    // Validate input using Joi
    const { error, value } = cancelCredexSchema.validate(req.body);
    if (error) {
      logError("CancelCredexController input validation failed", error);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { credexID } = value;

    const responseData = await CancelCredexService(credexID);
    
    if (!responseData) {
      logError("CancelCredexController: Credex not found or already processed", new Error(), { credexID });
      return res.status(404).json({ error: "Credex not found or already processed" });
    }

    logInfo("CancelCredexController: Credex cancelled successfully", { credexID });
    return res.status(200).json({ message: "Credex cancelled successfully", credexID: responseData });
  } catch (err) {
    logError("CancelCredexController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
