import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardController } from "../../Account/controllers/getAccountDashboard";

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
      const dashboardReq = {
        body: {
          memberID: req.body.signerID,
          accountID: acceptCredexData.acceptorAccountID
        }
      } as express.Request;
      const dashboardRes = {
        status: (code: number) => ({
          json: (data: any) => data
        })
      } as express.Response;

      const dashboardData = await GetAccountDashboardController(dashboardReq, dashboardRes);
      res.json({
        acceptCredexData: acceptCredexData,
        dashboardData: dashboardData,
      });
    } else {
      res.status(400).json({ error: "Failed to accept Credex" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
