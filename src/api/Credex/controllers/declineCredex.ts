import express from "express";
import { DeclineCredexService } from "../services/DeclineCredex";
import { logError, logInfo } from "../../../utils/logger";
import Joi from "joi";

const declineCredexSchema = Joi.object({
  credexID: Joi.string().uuid().required()
});

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
  try {
    // Validate input using Joi
    const { error, value } = declineCredexSchema.validate(req.body);
    if (error) {
      logError("DeclineCredexController input validation failed", error);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { credexID } = value;

    const responseData = await DeclineCredexService(credexID);
    
    if (!responseData) {
      logError("DeclineCredexController: Failed to decline Credex", new Error(), { credexID });
      return res.status(404).json({ error: "Credex not found or already processed" });
    }

    logInfo("DeclineCredexController: Credex declined successfully", { credexID });
    return res.status(200).json({ message: "Credex declined successfully", data: responseData });
  } catch (err) {
    logError("DeclineCredexController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
