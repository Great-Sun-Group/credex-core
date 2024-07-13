import express from "express";
import { OnboardHumanService } from "../services/OnboardHuman";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { GetHumanDashboardService } from "../services/GetHumanDashboardByPhone";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function OnboardHumanController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const fieldsRequired = [
    "firstname",
    "lastname",
    "defaultDenom",
    "phone",
    "handle",
  ];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  try {
    const onboardedHuman = await OnboardHumanService(
      req.body.firstname,
      req.body.lastname,
      req.body.handle,
      req.body.defaultDenom,
      req.body.phone,
      req.body.DCOgiveInCXX,
      req.body.DCOdenom
    );

    if (!onboardedHuman.onboardedHumanID) {
      res.status(400).json({ message: onboardedHuman.message });
      return;
    }

    const consumptionAccount = await CreateAccountService(
      onboardedHuman.onboardedHumanID,
      "CONSUMPTION",
      `${req.body.firstname} ${req.body.lastname}`,
      req.body.handle,
      req.body.defaultDenom
    );

    if (!consumptionAccount.accountID) {
      res.status(400).json({ message: consumptionAccount.message });
      return;
    }

    const humanDashboard = await GetHumanDashboardService(req.body.phone);
    if (!humanDashboard) {
      res.status(400).json({ message: "Could not retrieve human dashboard" });
      return;
    }

    const accountDashboards = await Promise.all(
      humanDashboard.authorizedFor.map((accountId: string) =>
        GetAccountDashboardService(humanDashboard.uniqueHumanID, accountId)
      )
    );

    res.status(200).json({ humanDashboard, accountDashboards });
  } catch (error) {
    console.error("Error onboarding human:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
