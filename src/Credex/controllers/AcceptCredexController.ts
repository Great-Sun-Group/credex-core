import express from "express";
import { AcceptCredexService } from "../services/AcceptCredexService";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function AcceptCredexController(
  req: express.Request,
  res: express.Response
) {
  try {
    const acceptCredexData = await AcceptCredexService(req.body.credexID);
    const dashboardData = await GetAccountDashboardService(
      req.body.accountID,
      req.body.accountID
    );
    res.json({
      acceptCredexData: acceptCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
