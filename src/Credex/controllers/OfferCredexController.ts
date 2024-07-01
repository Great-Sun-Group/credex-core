import express from "express";
import { OfferCredexService } from "../services/OfferCredexService";
import { GetDashboardService } from "../../Member/services/GetDashboardService";

export async function OfferCredexController(
  req: express.Request,
  res: express.Response
) {

  try {
    const offerCredexData = await OfferCredexService(req.body);
    const dashboardData = await GetDashboardService(
      req.body.issuerMemberID,
      req.body.authorizerMemberID
    );
    res.json({
      offerCredexData: offerCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error('Error in OfferCredexController:', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
