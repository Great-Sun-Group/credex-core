import express from "express";
import { GetHumanDashboardByPhoneService } from "../services/GetHumanDashboardByPhone";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function GetHumanDashboardByPhoneController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = [
    "phone",
  ];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }
  
  try {
    const humanDashboard = await GetHumanDashboardByPhoneService(req.body.phone);
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
