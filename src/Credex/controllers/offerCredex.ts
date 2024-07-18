import express from "express";
import { OfferCredexService } from "../services/OfferCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function OfferCredexController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = [
    "memberID",
    "issuerAccountID",
    "receiverAccountID",
    "Denomination",
    "InitialAmount",
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
    const offerCredexData = await OfferCredexService(req.body);
    const dashboardData = await GetAccountDashboardService(
      req.body.memberID,
      req.body.issuerAccountID
    );
    res.json({
      offerCredexData: offerCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in OfferCredexController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
