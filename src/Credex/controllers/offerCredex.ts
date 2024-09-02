import express from "express";
import { OfferCredexService } from "../services/OfferCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

/**
 * OfferCredexController
 * 
 * This controller handles the creation of new Credex offers.
 * It validates the required fields, calls the OfferCredexService,
 * and returns the result along with updated dashboard data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function OfferCredexController(
  req: express.Request,
  res: express.Response
) {
  // Validate required fields
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
    // Call OfferCredexService to create the Credex offer
    const offerCredexData = await OfferCredexService(req.body);
    
    // Fetch updated dashboard data
    const dashboardData = await GetAccountDashboardService(
      req.body.memberID,
      req.body.issuerAccountID
    );
    
    // Return the offer data and updated dashboard data
    res.json({
      offerCredexData: offerCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in OfferCredexController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
