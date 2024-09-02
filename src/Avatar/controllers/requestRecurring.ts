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

  // Validate optional parameters
  if (req.body.securedCredex !== undefined && typeof req.body.securedCredex !== 'boolean') {
    return res.status(400).json({ message: "securedCredex must be a boolean" });
  }

  if (req.body.credspan !== undefined) {
    const credspan = Number(req.body.credspan);
    if (isNaN(credspan) || credspan < 7 || credspan > 35) {
      return res.status(400).json({ message: "credspan must be a number between 7 and 35" });
    }
  }

  if (req.body.remainingPays !== undefined) {
    const remainingPays = Number(req.body.remainingPays);
    if (isNaN(remainingPays) || remainingPays < 0) {
      return res.status(400).json({ message: "remainingPays must be a positive number" });
    }
  }

  // Check securedCredex and credspan relationship
  if (req.body.securedCredex === true && req.body.credspan !== undefined) {
    return res.status(400).json({ message: "credspan must be null when securedCredex is true" });
  }

  if (req.body.securedCredex !== true && req.body.credspan === undefined) {
    return res.status(400).json({ message: "credspan must be provided when securedCredex is not true" });
  }

  try {
    const createRecurringData = await RequestRecurringService(
      req.body.signerMemberID,
      req.body.requestorAccountID,
      req.body.counterpartyAccountID,
      req.body.InitialAmount,
      req.body.Denomination,
      req.body.nextPayDate,
      req.body.daysBetweenPays,
      req.body.securedCredex,
      req.body.credspan,
      req.body.remainingPays,
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
