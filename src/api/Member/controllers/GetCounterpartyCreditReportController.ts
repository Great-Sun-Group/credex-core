import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { CounterpartyCreditReportService } from "../services/CounterpartyCreditReportService";

/**
 * Controller for retrieving counterparty credit report
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetCounterpartyCreditReportController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info("GetCounterpartyCreditReportController called", {
      controller: "GetCounterpartyCreditReportController",
      body: req.body,
    });

    const { memberID } = req.body;
    const requestingMemberID = req.user?.memberID;

    if (!requestingMemberID) {
      throw new Error("User ID not found in request");
    }

    // Get denomination from request body, default to USD
    const denomination = req.body.denomination || "USD";

    // Get the counterparty credit report service instance
    const creditReportService = CounterpartyCreditReportService.getInstance();

    // Generate the credit report
    const creditReport = await creditReportService.generateCounterpartyCreditReport(
      memberID,
      denomination
    );

    res.status(200).json({
      message: "Counterparty credit report retrieved successfully",
      data: {
        action: {
          id: memberID,
          type: "COUNTERPARTY_CREDIT_REPORT_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: requestingMemberID,
          details: {
            memberID,
            memberName: creditReport.memberName,
            denomination,
          },
        },
        creditReport,
      },
    });
  } catch (error) {
    logger.error("Error in GetCounterpartyCreditReportController", {
      controller: "GetCounterpartyCreditReportController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  }
}
