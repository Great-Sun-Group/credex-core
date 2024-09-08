import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { validateUUID } from "../../../utils/validators";

/**
 * AcceptRecurringController
 *
 * This controller handles the acceptance of recurring transactions.
 * It validates the required fields, calls the AcceptRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function AcceptRecurringController(
  req: express.Request,
  res: express.Response
) {
  try {
    const { avatarID, signerID } = req.body;

    // Validate required fields
    if (!avatarID || !signerID) {
      return res.status(400).json({ error: "avatarID and signerID are required" });
    }

    // Validate UUIDs
    if (!validateUUID(avatarID)) {
      return res.status(400).json({ error: "Invalid avatarID" });
    }
    if (!validateUUID(signerID)) {
      return res.status(400).json({ error: "Invalid signerID" });
    }

    // Call AcceptRecurringService to process the acceptance
    const acceptRecurringData = await AcceptRecurringService({
      avatarID,
      signerID
    });

    // Check if the service call was successful
    if (typeof acceptRecurringData.recurring === "boolean") {
      return res.status(400).json({ error: acceptRecurringData.message });
    }

    // Fetch dashboard data
    const dashboardData = await GetAccountDashboardService(
      signerID,
      acceptRecurringData.recurring.acceptorAccountID
    );

    if (!dashboardData) {
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    // Return the acceptance data and dashboard data
    return res.status(200).json({
      acceptRecurringData: acceptRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in AcceptRecurringController:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
