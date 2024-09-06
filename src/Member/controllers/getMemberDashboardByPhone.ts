import express from "express";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { GetAccountDashboardController } from "../../Account/controllers/getAccountDashboard";

export async function GetMemberDashboardByPhoneController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["phone"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

  try {
    const memberDashboard = await GetMemberDashboardByPhoneService(
      req.body.phone
    );
    if (!memberDashboard) {
      res.status(400).json({ message: "Could not retrieve member dashboard" });
      return;
    }

    const accountDashboards = await Promise.all(
      memberDashboard.accountIDS.map(async (accountId: string) => {
        const accountReq = {
          body: {
            memberID: memberDashboard.memberID,
            accountID: accountId
          }
        } as express.Request;
        const accountRes = {
          status: (code: number) => ({
            json: (data: any) => data
          })
        } as express.Response;

        return GetAccountDashboardController(accountReq, accountRes);
      })
    );

    res.status(200).json({ memberDashboard, accountDashboards });
  } catch (err) {
    console.error("Error retrieving account:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
