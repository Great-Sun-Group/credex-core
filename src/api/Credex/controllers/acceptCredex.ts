import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { logError, logInfo } from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

/**
 * AcceptCredexController
 * 
 * This controller handles the acceptance of Credex offers.
 * It validates the required fields, calls the AcceptCredexService,
 * and returns the result along with updated dashboard data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function AcceptCredexController(
  req: express.Request,
  res: express.Response
) {
  try {
    const { credexID, signerID } = req.body;

    if (!validateUUID(credexID)) {
      logError("AcceptCredexController: Invalid credexID", new Error(), { credexID });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    if (!validateUUID(signerID)) {
      logError("AcceptCredexController: Invalid signerID", new Error(), { signerID });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    const acceptCredexData = await AcceptCredexService(credexID, signerID);
    
    if (!acceptCredexData) {
      logError("AcceptCredexController: Failed to accept Credex", new Error(), { credexID, signerID });
      return res.status(400).json({ error: "Failed to accept Credex" });
    }

    const dashboardData = await GetAccountDashboardService(
      signerID,
      acceptCredexData.acceptorAccountID
    );

    if (!dashboardData) {
      logError("AcceptCredexController: Failed to fetch dashboard data", new Error(), { signerID, acceptorAccountID: acceptCredexData.acceptorAccountID });
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    logInfo("AcceptCredexController: Credex accepted successfully", { credexID, signerID });

    return res.status(200).json({
      acceptCredexData: acceptCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logError("AcceptCredexController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
