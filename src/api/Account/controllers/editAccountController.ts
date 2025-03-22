import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { editAccount } from "../services/EditAccount";
import { ApiActionType, AccountActionDetails } from "../../../types/apiResponse";
import logger from "../../../utils/logger";

/**
 * Controller for updating an existing exchange account
 * @param req - Express request object
 * @param res - Express response object
 */
export async function editAccountController(req: Request, res: Response) {
  const { accountName, accountHandle, defaultDenom } = req.body;
  const accountID = req.params.accountID;
  const memberID = req.user?.id;
  
  if (!memberID) {
    logger.error("User ID not found in request", { accountID });
    return res.status(401).json({
      message: "Unauthorized",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_UNAUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: "unknown",
          details: {
            error: "User not authenticated",
          },
        },
        dashboard: {},
      },
    });
  }

  logger.info("Edit account request received", {
    accountID,
    memberID,
    updatedFields: {
      accountName: accountName !== undefined,
      accountHandle: accountHandle !== undefined,
      defaultDenom: defaultDenom !== undefined,
    },
  });

  try {
    const result = await editAccount(
      {
        accountID,
        accountName,
        accountHandle,
        defaultDenom,
      },
      memberID
    );

    if (!result.success) {
      logger.warn("Edit account failed", {
        accountID,
        memberID,
        error: result.error,
      });

      return res.status(result.error?.code ? parseInt(result.error.code) : 500).json({
        message: result.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ACCOUNT_UPDATED,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              error: result.error,
            },
          },
          dashboard: {},
        },
      });
    }

    logger.info("Account updated successfully", {
      accountID,
      memberID,
      updatedFields: {
        accountName: accountName !== undefined,
        accountHandle: accountHandle !== undefined,
        defaultDenom: defaultDenom !== undefined,
      },
    });

    const accountDetails: AccountActionDetails = {
      accountID: result.data?.accountID || accountID,
      accountName: result.data?.accountName || "",
      accountHandle: result.data?.accountHandle || "",
      defaultDenom: result.data?.defaultDenom || "",
    };

    return res.status(200).json({
      message: "Account updated successfully",
      data: {
        action: {
          id: accountID,
          type: ApiActionType.ACCOUNT_UPDATED,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: accountDetails,
        },
        dashboard: {
          account: {
            accountID: result.data?.accountID || accountID,
            accountName: result.data?.accountName || "",
            accountHandle: result.data?.accountHandle || "",
            defaultDenom: result.data?.defaultDenom || "",
          },
        },
      },
    });
  } catch (error) {
    logger.error("Unexpected error in editAccountController", {
      error: error instanceof Error ? error.message : "Unknown error",
      accountID,
      memberID,
    });

    return res.status(500).json({
      message: "An unexpected error occurred",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
        dashboard: {},
      },
    });
  }
}
