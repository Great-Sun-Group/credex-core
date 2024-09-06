import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function OnboardMemberController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const fieldsRequired = [
    "firstname",
    "lastname",
    "phone",
  ];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  try {
    const onboardedMember = await OnboardMemberService(
      req.body.firstname,
      req.body.lastname,
      req.body.phone
    );

    if (!onboardedMember.onboardedMemberID) {
      res.status(400).json({ message: onboardedMember.message });
      return;
    }

    const consumptionAccount = await CreateAccountService(
      onboardedMember.onboardedMemberID,
      "PERSONAL_CONSUMPTION",
      `${req.body.firstname} ${req.body.lastname} Personal`,
      req.body.phone,
      "USD",
      req.body.DCOgiveInCXX,
      req.body.DCOdenom
    );

    if (!consumptionAccount.accountID) {
      res.status(400).json({ message: consumptionAccount.message });
      return;
    }

    const memberDashboard = await GetMemberDashboardByPhoneService(
      req.body.phone
    );
    if (!memberDashboard) {
      res.status(400).json({ message: "Could not retrieve member dashboard" });
      return;
    }

    const accountDashboards = await Promise.all(
      memberDashboard.accountIDS.map((accountId: string) =>
        GetAccountDashboardService(memberDashboard.memberID, accountId)
      )
    );

    res.status(200).json({ memberDashboard, accountDashboards });
  } catch (error) {
    console.error("Error onboarding member:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
