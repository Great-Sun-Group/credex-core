import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function AcceptRecurringController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["memberID", "acceptorAccountID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

  try {
    const acceptRecurringData = await AcceptRecurringService(
      req.body.memberID,
      req.body.acceptorAccountID
    );

    if (!acceptRecurringData.recurring) {
      return res.status(400).json(acceptRecurringData);
    }

    const dashboardData = await GetAccountDashboardService(
      req.body.acceptorAccountID,
      req.body.acceptorAccountID
    );

    res.json({
      acceptRecurringData: acceptRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in AcceptRecurringController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
