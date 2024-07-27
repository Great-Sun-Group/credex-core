import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function AcceptCredexController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["credexID", "signerID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

  try {
    const acceptCredexData = await AcceptCredexService(
      req.body.credexID,
      req.body.signerID,
    );
    
    if (acceptCredexData) {
      const dashboardData = await GetAccountDashboardService(
        acceptCredexData.memberID,
        acceptCredexData.acceptorAccountID
      );
      res.json({
        acceptCredexData: acceptCredexData,
        dashboardData: dashboardData,
      });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
