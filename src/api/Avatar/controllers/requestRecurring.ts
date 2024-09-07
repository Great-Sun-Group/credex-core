import express from "express";
import { RequestRecurringService } from "../services/RequestRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { getDenominations } from "../../../constants/denominations";

/**
 * RequestRecurringController
 * 
 * This controller handles the creation of recurring payment requests.
 * It validates the input, calls the RequestRecurringService,
 * and returns the result along with updated dashboard data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function RequestRecurringController(
  req: express.Request,
  res: express.Response
) {
  try {
    // Validate required fields
    const fieldsRequired = [
      "signerMemberID",
      "requestorAccountID",
      "counterpartyAccountID",
      "InitialAmount",
      "Denomination",
      "nextPayDate",
      "daysBetweenPays",
    ];
    for (const field of fieldsRequired) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Check denomination validity
    if (!getDenominations({ code: req.body.Denomination }).length) {
      return res.status(400).json({ error: "Denomination not permitted" });
    }

    // Validate optional parameters
    if (req.body.securedCredex !== undefined && typeof req.body.securedCredex !== 'boolean') {
      return res.status(400).json({ error: "securedCredex must be a boolean" });
    }

    if (req.body.credspan !== undefined) {
      const credspan = Number(req.body.credspan);
      if (isNaN(credspan) || credspan < 7 || credspan > 35) {
        return res.status(400).json({ error: "credspan must be a number between 7 and 35" });
      }
    }

    if (req.body.remainingPays !== undefined) {
      const remainingPays = Number(req.body.remainingPays);
      if (isNaN(remainingPays) || remainingPays < 0) {
        return res.status(400).json({ error: "remainingPays must be a positive number" });
      }
    }

    // Check securedCredex and credspan relationship
    if (req.body.securedCredex === true && req.body.credspan !== undefined) {
      return res.status(400).json({ error: "credspan must be null when securedCredex is true" });
    }

    if (req.body.securedCredex !== true && req.body.credspan === undefined) {
      return res.status(400).json({ error: "credspan must be provided when securedCredex is not true" });
    }

    const createRecurringData = await RequestRecurringService(req.body);

    if (!createRecurringData) {
      return res.status(400).json({ error: "Failed to create recurring payment" });
    }

    const dashboardData = await GetAccountDashboardService(
      req.body.signerMemberID,
      req.body.requestorAccountID
    );

    if (!dashboardData) {
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    return res.status(200).json({
      avatarMemberID: createRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in RequestRecurringController:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
