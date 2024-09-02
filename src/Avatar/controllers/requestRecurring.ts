import express from "express";
import { RequestRecurringService } from "../services/RequestRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { getDenominations } from "../../Core/constants/denominations";

export async function RequestRecurringController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = [
    "signerMemberID",
    "requestorAccountID",
    "counterpartyAccountID",
    "InitialAmount",
    "Denomination",
    "nextPayDate",
    "daysBetweenPays",
    "remainingPays",
  ];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

  // Check denomination validity
  if (!getDenominations({ code: req.body.Denomination }).length) {
    const message = "Error: denomination not permitted";
    console.log(message);
    return { recurring: false, message };
  }

  try {
    const createRecurringData = await RequestRecurringService(
      req.body.signerMemberID,
      req.body.requestorAccountID,
      req.body.counterpartyAccountID,
      req.body.InitialAmount,
      req.body.Denomination,
      req.body.secured,
      req.body.credspan,
      req.body.nextPayDate,
      req.body.daysBetweenPays,
      req.body.remainingPays
    );

    if (!createRecurringData) {
      return res.status(400).json(createRecurringData);
    }

    const dashboardData = await GetAccountDashboardService(
      req.body.signerMemberID,
      req.body.requestorAccountID
    );

    res.json({
      avatarMemberID: createRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in RequestRecurringController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
