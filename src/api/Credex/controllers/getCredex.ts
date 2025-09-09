import express from "express";
import { GetCredexService } from "../services/GetCredex";
import logger from "../../../utils/logger";
import { getDashboardData } from "../../../utils/dashboardUtils";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository, IMemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService, ISpendLimitService } from "../../Member/services/SpendLimitService";
import { CounterpartyCreditReportService } from "../../Member/services/CounterpartyCreditReportService";
import { UserRequest } from "../../../middleware/authMiddleware";
import {
  ApiActionType,
  TypedApiResponse,
  CredexActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);

type GetCredexResponse = TypedApiResponse<CredexActionDetails>;
type GetCredexErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * GetCredexController
 *
 * This controller handles retrieving Credex details.
 * It fetches the Credex data and returns it with associated information.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetCredexController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering GetCredexController", { requestId });

  try {
    const { credexID, accountID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Fetching Credex details", {
      credexID,
      accountID,
      requestId
    });

    const responseData = await GetCredexService(
      credexID,
      accountID
    );

    if (!responseData || !responseData.success || !responseData.data) {
      logger.warn("Credex not found or not accessible", {
        credexID,
        accountID,
        requestId,
        error: responseData?.message
      });

      const errorResponse: GetCredexErrorResponse = {
        message: responseData?.message || "Credex not found or not accessible",
        data: {
          action: {
            id: credexID,
            type: ApiActionType.ERROR_NOT_FOUND,
            timestamp: new Date().toISOString(),
            actor: accountID,
            details: {
              code: responseData?.error?.code || "NOT_FOUND",
              reason: responseData?.error?.details || "Credex not found or not accessible",
              field: "credexID"
            }
          },
          dashboard: {}
        }
      };
      return res.status(404).json(errorResponse);
    }

    const { credexData, clearedAgainstData } = responseData.data;

    // Get dashboard data
    const dashboardData = await getDashboardData(req.user.memberID, accountID, requestId, memberDashboardService);

    // Fetch counterparty credit ratings
    const creditReportService = CounterpartyCreditReportService.getInstance();
    let issuerMemberDetails = null;
    let acceptorMemberDetails = null;

    if (credexData.issuerMemberID) {
      try {
        const issuerReport = await creditReportService.generateCounterpartyCreditReport(
          credexData.issuerMemberID,
          credexData.Denomination || 'USD'
        );
        issuerMemberDetails = {
          memberID: issuerReport.memberID,
          firstname: issuerReport.memberName.split(' ')[0] || '',
          lastname: issuerReport.memberName.split(' ').slice(1).join(' ') || '',
          memberHandle: issuerReport.memberHandle,
          memberTier: credexData.issuerTier || 1,
          creditRating: {
            redeemedTotalUSD: issuerReport.creditRating.redeemedTotal,
            outstandingTotalUSD: issuerReport.creditRating.outstandingTotal,
            defaultedTotalUSD: issuerReport.creditRating.defaultedTotal,
            writtenOffTotalUSD: issuerReport.creditRating.writtenOffTotal
          },
          profilePictureUrl: issuerReport.profilePictureUrls?.thumbnail || credexData.issuerProfilePicture
        };
      } catch (error) {
        logger.warn('Failed to fetch issuer credit report', { memberID: credexData.issuerMemberID, error });
        // Fallback to basic member info
        issuerMemberDetails = {
          memberID: credexData.issuerMemberID,
          firstname: credexData.issuerFirstName,
          lastname: credexData.issuerLastName,
          memberHandle: credexData.issuerHandle,
          memberTier: credexData.issuerTier,
          profilePictureUrl: credexData.issuerProfilePicture
        };
      }
    }

    if (credexData.acceptorMemberID) {
      try {
        const acceptorReport = await creditReportService.generateCounterpartyCreditReport(
          credexData.acceptorMemberID,
          credexData.Denomination || 'USD'
        );
        acceptorMemberDetails = {
          memberID: acceptorReport.memberID,
          firstname: acceptorReport.memberName.split(' ')[0] || '',
          lastname: acceptorReport.memberName.split(' ').slice(1).join(' ') || '',
          memberHandle: acceptorReport.memberHandle,
          memberTier: credexData.acceptorTier || 1,
          creditRating: {
            redeemedTotalUSD: acceptorReport.creditRating.redeemedTotal,
            outstandingTotalUSD: acceptorReport.creditRating.outstandingTotal,
            defaultedTotalUSD: acceptorReport.creditRating.defaultedTotal,
            writtenOffTotalUSD: acceptorReport.creditRating.writtenOffTotal
          },
          profilePictureUrl: acceptorReport.profilePictureUrls?.thumbnail || credexData.acceptorProfilePicture
        };
      } catch (error) {
        logger.warn('Failed to fetch acceptor credit report', { memberID: credexData.acceptorMemberID, error });
        // Fallback to basic member info
        acceptorMemberDetails = {
          memberID: credexData.acceptorMemberID,
          firstname: credexData.acceptorFirstName,
          lastname: credexData.acceptorLastName,
          memberHandle: credexData.acceptorHandle,
          memberTier: credexData.acceptorTier,
          profilePictureUrl: credexData.acceptorProfilePicture
        };
      }
    }

    // Add relationships section to dashboard
    const enhancedDashboard = {
      ...dashboardData,
      relationships: {
        issuer: {
          member: issuerMemberDetails
        },
        acceptor: {
          member: acceptorMemberDetails
        }
      }
    };

    const successResponse: GetCredexResponse = {
      message: "Credex details retrieved successfully",
      data: {
        action: {
          id: credexID,
          type: ApiActionType.CREDEX_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: accountID,
          details: {
            amount: credexData.formattedInitialAmount.split(' ')[0],
            denomination: credexData.Denomination,
            securedCredex: credexData.securedCredex,
            receiverAccountName: credexData.counterpartyAccountName,
            currentUserAccountName: credexData.currentUserAccountName,
            transactionType: credexData.transactionType,
            status: {
              outstandingAmount: credexData.formattedOutstandingAmount,
              redeemedAmount: credexData.formattedRedeemedAmount,
              defaultedAmount: credexData.formattedDefaultedAmount,
              writtenOffAmount: credexData.formattedWrittenOffAmount,
              acceptedAt: credexData.acceptedAt,
              declinedAt: credexData.declinedAt,
              cancelledAt: credexData.cancelledAt,
              dueDate: credexData.dueDate
            },
            clearedAgainst: clearedAgainstData.map(item => ({
              credexID: item.clearedAgainstCredexID,
              amount: item.formattedClearedAmount,
              initialAmount: item.formattedClearedAgainstCredexInitialAmount,
              counterpartyName: item.clearedAgainstCounterpartyAccountName
            }))
          }
        },
        dashboard: enhancedDashboard
      }
    };

    logger.info("Credex details retrieved successfully", {
      credexID,
      accountID,
      requestId
    });

    return res.status(200).json(successResponse);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not authorized')) {
        logger.warn("Unauthorized attempt to access Credex", {
          error: error.message,
          requestId
        });
        const errorResponse: GetCredexErrorResponse = {
          message: "Not authorized to access this Credex",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_UNAUTHORIZED,
              timestamp: new Date().toISOString(),
              actor: req.body.accountID,
              details: {
                code: "UNAUTHORIZED",
                reason: "Not authorized to access this Credex"
              }
            },
            dashboard: {}
          }
        };
        return res.status(403).json(errorResponse);
      }

      if (error.message === 'No records found') {
        logger.warn("Attempt to access non-existent Credex", {
          error: error.message,
          requestId
        });
        const errorResponse: GetCredexErrorResponse = {
          message: "Credex not found",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: req.body.accountID,
              details: {
                code: "NOT_FOUND",
                reason: "The specified Credex could not be found",
                field: "credexID"
              }
            },
            dashboard: {}
          }
        };
        return res.status(404).json(errorResponse);
      }

      if (error.message.includes('database error')) {
        logger.error("Database error in GetCredexController", {
          error: error.message,
          stack: error.stack,
          requestId
        });
        const errorResponse: GetCredexErrorResponse = {
          message: "Failed to retrieve Credex details due to database error",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_INTERNAL,
              timestamp: new Date().toISOString(),
              actor: "system",
              details: {
                code: "DATABASE_ERROR",
                reason: "Database error occurred while retrieving Credex details",
                suggestion: "Please try again or contact support if the issue persists"
              }
            },
            dashboard: {}
          }
        };
        return res.status(500).json(errorResponse);
      }
    }

    logger.error("Unexpected error in GetCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    
    const errorResponse: GetCredexErrorResponse = {
      message: "An unexpected error occurred while retrieving the Credex",
      data: {
        action: {
          id: req.body.credexID,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
            suggestion: "Please try again or contact support if the issue persists"
          }
        },
            dashboard: {}
      }
    };
    
    return res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting GetCredexController", { requestId });
  }
}
