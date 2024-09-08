import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
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

    // Validate required fields
    if (!credexID || !signerID) {
      return res.status(400).json({ error: "credexID and signerID are required" });
    }

    // Validate UUIDs
    if (!validateUUID(credexID)) {
      return res.status(400).json({ error: "Invalid credexID" });
    }
    if (!validateUUID(signerID)) {
      return res.status(400).json({ error: "Invalid signerID" });
    }

    const acceptCredexData = await AcceptCredexService(credexID, signerID);
    
    if (!acceptCredexData) {
      return res.status(400).json({ error: "Failed to accept Credex" });
    }

    const dashboardData = await GetAccountDashboardService(
      signerID,
      acceptCredexData.acceptorAccountID
    );

    if (!dashboardData) {
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    return res.status(200).json({
      acceptCredexData: acceptCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in AcceptCredexController:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
