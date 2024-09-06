import express from "express";
import { CancelCredexService } from "../services/CancelCredex";

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
    // Validate required fields
    if (!req.body.credexID) {
      return res.status(400).json({ error: "credexID is required" });
    }

    const responseData = await CancelCredexService(req.body.credexID);
    
    if (!responseData) {
      return res.status(404).json({ error: "Credex not found or already processed" });
    }

    return res.status(200).json({ message: "Credex cancelled successfully", credexID: responseData });
  } catch (err) {
    console.error("Error in CancelCredexController:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
