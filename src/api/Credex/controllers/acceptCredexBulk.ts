import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardController } from "../../Account/controllers/getAccountDashboard";
import { validateUUID } from "../../../utils/validators";

export async function AcceptCredexBulkController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["credexIDs", "signerID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

  if (
    !Array.isArray(req.body.credexIDs) ||
    !req.body.credexIDs.every((id: any) => typeof id === "string" && validateUUID(id))
  ) {
    return res
      .status(400)
      .json({ message: "Array of valid credexIDs (UUIDs) to accept is required" });
  }

  if (!validateUUID(req.body.signerID)) {
    return res
      .status(400)
      .json({ message: "Invalid signerID. Must be a valid UUID." });
  }

  try {
    const acceptCredexData = await Promise.all(
      req.body.credexIDs.map(async (credexID: string) => {
        const data = await AcceptCredexService(credexID, req.body.signerID);
        if (data) {
          return data;
        }
        return null;
      })
    );

    // Filter out any null values
    const validCredexData = acceptCredexData.filter(
      (
        item
      ): item is {
        acceptedCredexID: any;
        acceptorAccountID: any;
        memberID: any;
      } => item !== null
    );

    if (validCredexData.length > 0) {
      // Assuming that memberID and acceptorAccountID are the same for all returned objects
      const { memberID, acceptorAccountID } = validCredexData[0];

      const dashboardReq = {
        body: {
          memberID,
          accountID: acceptorAccountID
        }
      } as express.Request;
      const dashboardRes = {
        status: (code: number) => ({
          json: (data: any) => data
        })
      } as express.Response;

      const dashboardData = await GetAccountDashboardController(dashboardReq, dashboardRes);
      res.json({
        acceptCredexData: validCredexData,
        dashboardData: dashboardData,
      });
    } else {
      // Handle the case when there are no valid data returned from AcceptCredexService
      res
        .status(400)
        .json({ error: "No valid data returned from AcceptCredexService" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
