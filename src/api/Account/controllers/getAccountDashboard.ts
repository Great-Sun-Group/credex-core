import express from "express";
import { GetAccountDashboardService } from "../services/GetAccountDashboard";

export async function GetAccountDashboardController(
  req: express.Request,
  res: express.Response
) {
  const { memberID, accountID } = req.body;

  if (!memberID || !accountID) {
    return res.status(400).json({ message: "memberID and accountID are required" });
  }

  try {
    const accountDashboard = await GetAccountDashboardService(memberID, accountID);

    if (!accountDashboard) {
      return res.status(404).json({ message: "Account dashboard not found" });
    }

    return res.status(200).json(accountDashboard);
  } catch (error) {
    console.error("Error getting account dashboard:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}