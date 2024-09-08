import express from "express";
import { GetCredexService } from "../services/GetCredex";
import { logError, logInfo } from "../../../utils/logger";
import Joi from "joi";

const getCredexSchema = Joi.object({
  credexID: Joi.string().uuid().required(),
  accountID: Joi.string().uuid().required()
});

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
  try {
    // Validate input using Joi
    const { error, value } = getCredexSchema.validate(req.query);
    if (error) {
      logError("GetCredexController input validation failed", error);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { credexID, accountID } = value;

    const responseData = await GetCredexService(credexID, accountID);
    
    if (!responseData) {
      logError("GetCredexController: Credex not found", new Error(), { credexID, accountID });
      return res.status(404).json({ error: "Credex not found" });
    }

    logInfo("GetCredexController: Credex details retrieved successfully", { credexID, accountID });
    return res.status(200).json(responseData);
  } catch (err) {
    logError("GetCredexController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
