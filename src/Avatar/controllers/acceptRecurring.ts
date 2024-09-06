import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { GetAccountDashboardController } from "../../Account/controllers/getAccountDashboard";

/**
 * AcceptRecurringController
 * 
 * This controller handles the acceptance of recurring transactions.
 * It validates the required fields, calls the AcceptRecurringService,
 * and returns the result along with updated dashboard data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function AcceptRecurringController(
  req: express.Request,
  res: express.Response
) {
  // Validate required fields
  const fieldsRequired = ["avatarID", "signerID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

  try {
    // Call AcceptRecurringService to process the acceptance
    const acceptRecurringData = await AcceptRecurringService(
      req.body.avatarID,
      req.body.signerID
    );

    // Check if the service call was successful
    if (!acceptRecurringData) {
      return res.status(400).json(acceptRecurringData);
    }

    // Handle errors in recurring transaction creation
    if (typeof acceptRecurringData.recurring == "boolean") {
      throw new Error("Recurring transaction could not be created");
    }

    // If acceptorAccountID exists and is a string, fetch dashboard data
    if (
      acceptRecurringData.recurring.acceptorAccountID &&
      typeof acceptRecurringData.recurring.acceptorAccountID === "string"
    ) {
      const dashboardReq = {
        body: {
          memberID: req.body.signerID,
          accountID: acceptRecurringData.recurring.acceptorAccountID
        }
      } as express.Request;
      const dashboardRes = {
        status: (code: number) => ({
          json: (data: any) => data
        })
      } as express.Response;

      const dashboardData = await GetAccountDashboardController(dashboardReq, dashboardRes);

      // Return the acceptance data and dashboard data
      res.json({
        acceptRecurringData: acceptRecurringData,
        dashboardData: dashboardData,
      });
    } else {
      throw new Error("credexFoundation could not be created");
    }
  } catch (err) {
    console.error("Error in AcceptRecurringController:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
