import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function AcceptRecurringController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["avatarID", "signerID"];
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
      req.body.avatarID,
      req.body.signerID
    );

    if (!acceptRecurringData) {
      return res.status(400).json(acceptRecurringData);
    }

    if (typeof acceptRecurringData.recurring == "boolean") {
      throw new Error("Recurring transaction could not be created");
    }
    if (
      acceptRecurringData.recurring.acceptorAccountID &&
      typeof acceptRecurringData.recurring.acceptorAccountID === "string"
    ) {
      const dashboardData = await GetAccountDashboardService(
        req.body.signerID,
        acceptRecurringData.recurring.acceptorAccountID
      );

      res.json({
        acceptRecurringData: acceptRecurringData,
        dashboardData: dashboardData,
      });
    } else {
      throw new Error("credexFoundation could not be created");
    }
  } catch (err) {
    console.error("Error in AcceptRecurringController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
