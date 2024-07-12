import express from "express";
import { GetHumanDashboardService } from "../services/GetHumanDashboard";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function WhatsappLoginHumanController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const humanDashboard = await GetHumanDashboardService(req.body.phone);
    if (!humanDashboard) {
      res.status(400).json({ message: "Could not retrieve human dashboard" });
      return;
    }

    const accountDashboards = await Promise.all(
      humanDashboard.authorizedFor.map((accountId: string) =>
        GetAccountDashboardService(humanDashboard.uniqueHumanID, accountId)
      )
    );

    res.status(200).json({ humanDashboard, accountDashboards });
  } catch (err) {
    console.error("Error retrieving account:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
