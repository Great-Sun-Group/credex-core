import express from "express";
import { CreateRecurringService } from "../services/CreateRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

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
    "credexType",
    "OFFERSorREQUESTS",
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

  try {
    const createRecurringData = await CreateRecurringService({
      ...req.body,
      InitialAmount: parseFloat(req.body.InitialAmount),
      daysBetweenPays: parseInt(req.body.daysBetweenPays),
      remainingPays: req.body.remainingPays
        ? parseInt(req.body.remainingPays)
        : undefined,
    });

    if (!createRecurringData.recurring) {
      return res.status(400).json(createRecurringData);
    }

    const dashboardData = await GetAccountDashboardService(
      req.body.signerMemberID,
      req.body.requestorAccountID
    );

    res.json({
      createRecurringData: createRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in RequestRecurringController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
