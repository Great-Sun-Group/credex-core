import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { GetAccountDashboardController } from "../../Account/controllers/getAccountDashboard";

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

    const dashboardReq = {
      body: {
        memberID: req.body.signerID,
        accountID: req.body.cancelerAccountID
      }
    } as express.Request;
    const dashboardRes = {
      status: (code: number) => ({
        json: (data: any) => data
      })
    } as express.Response;

    const dashboardData = await GetAccountDashboardController(dashboardReq, dashboardRes);

    res.json({
      cancelRecurringData: cancelRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in DeclineRecurringController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
