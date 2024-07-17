import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";

export async function AcceptCredexBulkController(
  req: express.Request,
  res: express.Response
) {
  if (
    !Array.isArray(req.body) ||
    !req.body.every((id) => typeof id === "string")
  ) {
    return res
      .status(400)
      .json({ message: "Array of credexIDs to accept is required" });
  }

  try {
const acceptCredexData = await Promise.all(
  req.body.map(async (credexID) => {
    const data = await AcceptCredexService(credexID);
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
  ): item is { acceptedCredexID: any; acceptorAccountID: any; memberID: any } =>
    item !== null
);

if (validCredexData.length > 0) {
  // Assuming that memberID and acceptorAccountID are the same for all returned objects
  const { memberID, acceptorAccountID } = validCredexData[0];

  const dashboardData = await GetAccountDashboardService(
    memberID,
    acceptorAccountID
  );
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
