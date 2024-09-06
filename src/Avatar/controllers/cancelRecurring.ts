import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
//comment here
export async function DeclineRecurringController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["signerID", "cancelerAccountID", "avatarID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

  try {
    const cancelRecurringData = await CancelRecurringService(
      req.body.signerID,
      req.body.cancelerAccountID,
      req.body.avatarID
    );

    if (!cancelRecurringData) {
      return res.status(400).json(cancelRecurringData);
    }

    const dashboardData = await GetAccountDashboardService(
      req.body.signerID,
      req.body.cancelerAccountID
    );

    res.json({
      cancelRecurringData: cancelRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in DeclineRecurringController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
