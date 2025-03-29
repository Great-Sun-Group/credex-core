import express from "express";
import { CreateCredexService } from "../services/CreateCredex";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService } from "../../Member/services/SpendLimitService";
import { checkDueDate, credspan } from "../../../core-cron/constants/credspan";
import { AuthForTierSpendLimitService } from "../../Member/services/AuthForTierSpendLimit";
import logger from "../../../utils/logger";
import { getDashboardData } from "../../../utils/dashboardUtils";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { ManagedTransaction } from "neo4j-driver";

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);
import {
  ApiActionType,
  TypedApiResponse,
  CredexActionDetails,
  ErrorActionDetails,
} from "../../../types/apiResponse";
import { denomFormatter } from "../../../utils/denomUtils";
import {
  CredexNotificationService,
  ICredexNotificationService,
} from "../../Notifications/services/CredexNotificationService";

interface UserRequest extends express.Request {
  user?: any;
}

type CreateCredexResponse = TypedApiResponse<CredexActionDetails>;
type CreateCredexErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * CreateCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates business rules, performs authorization checks,
 * and creates the Credex with appropriate relationships.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateCredexController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering CreateCredexController", {
    requestId,
    body: req.body,
  });

  try {
    // Initialize notification service
    const notificationService = await CredexNotificationService.getInstance();

    const {
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
      invoiceID,
    } = req.body;

    // Get memberID from auth token to use as signerID
    const signerID = req.user.memberID;

    // Custom validation for invoice-based Credex creation
    if (invoiceID) {
      logger.debug("Invoice-based Credex creation detected", {
        requestId,
        invoiceID,
        issuerAccountID,
      });

      // If invoiceID is provided but other required fields are missing, we'll let the service handle it
      // The service will fetch the missing data from the invoice
    } else {
      // For direct Credex creation, validate all required fields
      if (!receiverAccountID || !Denomination || !InitialAmount) {
        logger.warn("Missing required parameters for direct Credex creation", {
          requestId,
          receiverAccountID,
          Denomination,
          InitialAmount,
        });

        const errorResponse: CreateCredexErrorResponse = {
          message: "Missing required parameters for direct Credex creation",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "MISSING_PARAMS",
                reason:
                  "receiverAccountID, Denomination, and InitialAmount are required when not using invoiceID",
              },
            },
            dashboard: {},
          },
        };
        return res.status(400).json(errorResponse);
      }
    }

    // Basic validation is handled by validateRequest middleware
    logger.debug("Validating business rules", {
      requestId,
      issuerAccountID,
      receiverAccountID,
      securedCredex,
      dueDate,
    });

    // Check if issuer and receiver are different
    if (receiverAccountID && issuerAccountID === receiverAccountID) {
      logger.warn("Attempted to create Credex with same issuer and receiver", {
        issuerAccountID,
        receiverAccountID,
        requestId,
      });
      const errorResponse: CreateCredexErrorResponse = {
        message: "Issuer and receiver cannot be the same account",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "INVALID_ACCOUNTS",
              reason: "Issuer and receiver cannot be the same account",
              field: "receiverAccountID",
            },
          },
          dashboard: { member: null, account: null },
        },
      };
      return res.status(400).json(errorResponse);
    }

    // If invoiceID is provided but other parameters are missing, fetch them from the invoice
    let updatedInitialAmount = InitialAmount;
    let updatedDenomination = Denomination;

    if (invoiceID && (!InitialAmount || !Denomination)) {
      logger.debug("Fetching invoice data for tier authorization", {
        invoiceID,
        requestId,
      });

      const ledgerSpaceSession = ledgerSpaceDriver.session();
      try {
        // Fetch invoice data
        const invoiceData = await ledgerSpaceSession.executeRead(async (tx: ManagedTransaction) => {
          const query = `
            MATCH (invoice:Invoice {invoiceID: $invoiceID})
            RETURN 
              invoice.TotalAmount as totalAmount,
              invoice.Denomination as denomination
          `;

          const result = await tx.run(query, { invoiceID });

          if (result.records.length === 0) {
            return { success: false, error: "INVOICE_NOT_FOUND" };
          }

          const record = result.records[0];
          return {
            success: true,
            data: {
              totalAmount: record.get("totalAmount"),
              denomination: record.get("denomination"),
            },
          };
        });

        if (!invoiceData.success || !invoiceData.data) {
          logger.warn("Failed to fetch invoice data for tier authorization", {
            invoiceID,
            requestId,
          });

          const errorResponse: CreateCredexErrorResponse = {
            message: "Failed to fetch invoice data",
            data: {
              action: {
                id: null,
                type: ApiActionType.ERROR_NOT_FOUND,
                timestamp: new Date().toISOString(),
                actor: signerID,
                details: {
                  code: "INVOICE_NOT_FOUND",
                  reason:
                    "The specified invoice could not be found or accessed",
                },
              },
              dashboard: {},
            },
          };
          return res.status(404).json(errorResponse);
        }

        // Use invoice data for tier authorization
        updatedInitialAmount = InitialAmount || invoiceData.data.totalAmount;
        updatedDenomination = Denomination || invoiceData.data.denomination;

        logger.debug(
          "Successfully fetched invoice data for tier authorization",
          {
            totalAmount: updatedInitialAmount,
            denomination: updatedDenomination,
            requestId,
          }
        );
      } catch (error) {
        logger.error("Error fetching invoice data for tier authorization", {
          error: error instanceof Error ? error.message : "Unknown error",
          invoiceID,
          requestId,
        });

        const errorResponse: CreateCredexErrorResponse = {
          message: "Failed to fetch invoice data",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_INTERNAL,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "DB_ERROR",
                reason: "Error accessing invoice data",
              },
            },
            dashboard: {},
          },
        };
        return res.status(500).json(errorResponse);
      } finally {
        await ledgerSpaceSession.close();
      }
    }

    // Check membership tier authorization
    logger.debug("Checking membership tier authorization", {
      issuerAccountID,
      InitialAmount: updatedInitialAmount,
      Denomination: updatedDenomination,
      requestId,
    });

    const tierAuth = await AuthForTierSpendLimitService(
      issuerAccountID,
      updatedInitialAmount,
      updatedDenomination,
      securedCredex,
      requestId
    );

    if (!tierAuth.success) {
      logger.warn("Tier limit exceeded", {
        issuerAccountID,
        InitialAmount,
        Denomination,
        requestId,
        message: tierAuth.message,
      });
      // Handle different error codes from AuthForTierSpendLimitService
      if (tierAuth.error?.code === "NOT_FOUND") {
        const errorResponse: CreateCredexErrorResponse = {
          message: tierAuth.message,
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_UNAUTHORIZED,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "FORBIDDEN",
                reason: tierAuth.message,
              },
            },
            dashboard: {},
          },
        };
        return res.status(403).json(errorResponse);
      } else {
        const errorResponse: CreateCredexErrorResponse = {
          message: tierAuth.message,
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_UNAUTHORIZED,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "TIER_LIMIT_EXCEEDED",
                reason: tierAuth.message,
                field: "securedCredex",
              },
            },
            dashboard: {},
          },
        };
        return res.status(403).json(errorResponse);
      }
    }

    // Validate due date for unsecured credex
    if (!securedCredex) {
      if (!dueDate) {
        logger.warn("Missing due date for unsecured credex", { requestId });
        const errorResponse: CreateCredexErrorResponse = {
          message: "Due date is required for unsecured credex",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "MISSING_DUE_DATE",
                reason: "Due date is required for unsecured credex",
                field: "dueDate",
              },
            },
            dashboard: {},
          },
        };
        return res.status(400).json(errorResponse);
      }

      const dueDateOK = await checkDueDate(dueDate);
      if (!dueDateOK) {
        logger.warn("Invalid due date", { dueDate, requestId });
        const errorResponse: CreateCredexErrorResponse = {
          message: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan / 7} weeks from today.`,
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "INVALID_DUE_DATE",
                reason: `Due date must be between 1 and ${credspan / 7} weeks from today`,
                field: "dueDate",
              },
            },
            dashboard: {},
          },
        };
        return res.status(400).json(errorResponse);
      }
    } else if (dueDate) {
      logger.warn("Due date provided for secured credex", { requestId });
      const errorResponse: CreateCredexErrorResponse = {
        message: "Due date is not allowed for secured credex",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "INVALID_DUE_DATE",
              reason: "Due date is not allowed for secured credex",
              field: "dueDate",
            },
          },
          dashboard: {},
        },
      };
      return res.status(400).json(errorResponse);
    }

    // Create the Credex
    logger.info("Creating new Credex", {
      signerID,
      issuerAccountID,
      receiverAccountID,
      credexType,
      requestId,
    });

    const createCredexResult = await CreateCredexService({
      signerID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
      invoiceID,
      requestId,
    });

    if (!createCredexResult.success || !createCredexResult.data) {
      logger.warn("Failed to create Credex", {
        error: createCredexResult.message,
        code: createCredexResult.error?.code,
        requestId,
      });

      const errorResponse: CreateCredexErrorResponse = {
        message: createCredexResult.message || "Failed to create Credex",
        data: {
          action: {
            id: null,
            timestamp: new Date().toISOString(),
            actor: signerID,
            type: ApiActionType.ERROR_UNAUTHORIZED,
            details: {
              code: createCredexResult.error?.code || "CREATE_FAILED",
              reason: createCredexResult.message || "Failed to create Credex",
            },
          },
          dashboard: {},
        },
      };

      // Map error codes to appropriate status and action type
      switch (createCredexResult.error?.code) {
        case "FORBIDDEN":
        case "INSUFFICIENT_SECURED_BALANCE":
          return res.status(403).json(errorResponse);
        case "INVOICE_NOT_FOUND":
          errorResponse.data.action.type = ApiActionType.ERROR_NOT_FOUND;
          errorResponse.data.action.details.reason =
            "The specified invoice could not be found";
          return res.status(404).json(errorResponse);
        case "DB_ERROR":
        case "INTERNAL_ERROR":
          errorResponse.data.action.type = ApiActionType.ERROR_INTERNAL;
          errorResponse.data.action.details.suggestion =
            "Please try again or contact support if the issue persists";
          return res.status(500).json(errorResponse);
        default:
          errorResponse.data.action.type = ApiActionType.CREDEX_CREATE_FAILED;
          return res.status(400).json(errorResponse);
      }
    }

    // Fetch updated standardized dashboard data
    logger.debug("Fetching updated dashboard data", {
      signerID,
      issuerAccountID,
      requestId,
    });

    const dashboard = await getDashboardData(
      signerID,
      issuerAccountID,
      requestId,
      memberDashboardService
    );

    // Use the formatted amount from the service result
    const successResponse: CreateCredexResponse = {
      message: `${securedCredex ? "Secured" : "Unsecured"} credex for ${createCredexResult.data.formattedInitialAmount} ${createCredexResult.data.transactionType.toLowerCase()} created successfully`,
      data: {
        action: {
          id: createCredexResult.data.credexID,
          type: ApiActionType.CREDEX_CREATED,
          timestamp: new Date().toISOString(),
          actor: signerID,
          details: {
            amount: createCredexResult.data.formattedInitialAmount,
            denomination: createCredexResult.data.secured ? "USD" : Denomination, // Fallback to USD for secured Credex if Denomination is undefined
            securedCredex,
            receiverAccountID: createCredexResult.data.receiverAccountID,
            receiverAccountName:
              createCredexResult.data.counterpartyAccountName,
            invoiceID: invoiceID || undefined,
          },
        },
        dashboard,
      },
    };

    logger.info("Credex created successfully", {
      credexID: createCredexResult.data.credexID,
      signerID,
      issuerAccountID,
      receiverAccountID,
      requestId,
    });

    // Send notification for offer creation
    try {
      await notificationService.notifyOfferCreated({
        receiverMemberID: createCredexResult.data.receiverMemberID,
        credexID: createCredexResult.data.credexID,
        amount: createCredexResult.data.formattedInitialAmount,
        denomination: createCredexResult.data.secured ? "USD" : Denomination, // Fallback to USD for secured Credex if Denomination is undefined
        counterpartyName: createCredexResult.data.issuerAccountName,
        requestId,
      });
    } catch (error) {
      // Log but don't fail the request
      logger.error("Failed to send notification", {
        error: error instanceof Error ? error.message : "Unknown error",
        requestId,
      });
    }

    return res.status(200).json(successResponse);
  } catch (error) {
    logger.error("Unexpected error in CreateCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    const errorResponse: CreateCredexErrorResponse = {
      message: "An unexpected error occurred while creating the Credex",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
            suggestion:
              "Please try again or contact support if the issue persists",
          },
        },
        dashboard: {},
      },
    };

    return res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting CreateCredexController", { requestId });
  }
}
