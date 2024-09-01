import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function DeclineRecurringController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["memberID", "declinerAccountID"];
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
      req.body.memberID,
      req.body.declinerAccountID
    );

    if (!cancelRecurringData.recurring) {
      return res.status(400).json(cancelRecurringData);
    }

    const dashboardData = await GetAccountDashboardService(
      req.body.declinerAccountID,
      req.body.declinerAccountID
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
