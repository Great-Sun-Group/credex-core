import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../core-cron/constants/denominations";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface UpdateAccountResult {
  success: boolean;
  data?: {
    accountID: string;
    accountProperties: {
      accountName?: string;
      accountHandle?: string;
      defaultDenom?: string;
      DCOgiveInCXX?: number;
      DCOdenom?: string;
      updatedAt: string;
    };
  };
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * UpdateAccountService
 * 
 * Updates account properties such as name, handle, default denomination,
 * and DCO settings. Only updates provided fields.
 * 
 * @param ownerID - ID of the account owner
 * @param accountID - ID of the account to update
 * @param accountName - Optional new account name
 * @param accountHandle - Optional new account handle
 * @param defaultDenom - Optional new default denomination
 * @param DCOgiveInCXX - Optional new DCO give rate
 * @param DCOdenom - Optional new DCO denomination
 * @returns UpdateAccountResult containing updated account details
 */
export async function UpdateAccountService(
  ownerID: string,
  accountID: string,
  accountName?: string,
  accountHandle?: string,
  defaultDenom?: string,
  DCOgiveInCXX?: number,
  DCOdenom?: string
): Promise<UpdateAccountResult> {
  logger.debug("UpdateAccountService called", {
    ownerID,
    accountID,
    accountName,
    accountHandle,
    defaultDenom,
    DCOgiveInCXX,
    DCOdenom,
  });

  // Validate denominations if provided
  if (defaultDenom && !getDenominations({ code: defaultDenom }).length) {
    return {
      success: false,
      message: `Invalid default denomination: ${defaultDenom}`,
      error: {
        code: "INVALID_DENOMINATION",
        details: "The provided default denomination is not supported"
      }
    };
  }

  if (DCOdenom && !getDenominations({ code: DCOdenom }).length) {
    return {
      success: false,
      message: `Invalid DCO denomination: ${DCOdenom}`,
      error: {
        code: "INVALID_DCO_DENOMINATION",
        details: "The provided DCO denomination is not supported"
      }
    };
  }

  const dataToUpdate: Record<string, any> = {
    updatedAt: new Date().toISOString()
  };

  // Only include fields that are provided
  if (accountName !== undefined) dataToUpdate.accountName = accountName;
  if (accountHandle !== undefined) dataToUpdate.accountHandle = accountHandle;
  if (defaultDenom !== undefined) dataToUpdate.defaultDenom = defaultDenom;
  if (DCOgiveInCXX !== undefined) dataToUpdate.DCOgiveInCXX = DCOgiveInCXX;
  if (DCOdenom !== undefined) dataToUpdate.DCOdenom = DCOdenom;

  // If no fields to update except updatedAt, return early
  if (Object.keys(dataToUpdate).length === 1) {
    logger.warn("No fields provided for update", { accountID });
    return {
      success: false,
      message: "No fields provided for update",
      error: {
        code: "NO_UPDATE_DATA",
        details: "At least one field must be provided to update"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // First check if handle is already in use (if updating handle)
    if (accountHandle) {
      const handleCheck = await ledgerSpaceSession.executeRead(async (tx) => {
        const result = await tx.run(
          `
          MATCH (account:Account { accountHandle: $accountHandle })
          WHERE account.accountID <> $accountID
          RETURN account.accountHandle
          `,
          { accountHandle, accountID }
        );
        return result.records.length > 0;
      });

      if (handleCheck) {
        return {
          success: false,
          message: `Account handle '${accountHandle}' is already in use`,
          error: {
            code: "HANDLE_EXISTS",
            details: "Please choose a different account handle"
          }
        };
      }
    }

    logger.debug("Executing database query to update account", {
      ownerID,
      accountID,
      dataToUpdate,
    });

    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      return tx.run(
        `
        MATCH
          (owner:Member { memberID: $ownerID })
          -[:OWNS]->
          (account:Account { accountID: $accountID })
        SET account += $dataToUpdate
        RETURN
          account.accountID as accountID,
          account {
            accountName: account.accountName,
            accountHandle: account.accountHandle,
            defaultDenom: account.defaultDenom,
            DCOgiveInCXX: account.DCOgiveInCXX,
            DCOdenom: account.DCOdenom,
            updatedAt: account.updatedAt
          } as properties
        `,
        { ownerID, accountID, dataToUpdate }
      );
    });

    if (!result.records.length) {
      // Check if account exists
      const accountCheck = await ledgerSpaceSession.executeRead(async (tx) => {
        const result = await tx.run(
          `
          MATCH (account:Account { accountID: $accountID })
          RETURN account
          `,
          { accountID }
        );
        return result.records.length > 0;
      });

      if (!accountCheck) {
        return {
          success: false,
          message: "Account not found",
          error: {
            code: "ACCOUNT_NOT_FOUND",
            details: "The specified account does not exist"
          }
        };
      }

      return {
        success: false,
        message: "Not authorized to update account",
        error: {
          code: "UNAUTHORIZED",
          details: "You must be the account owner to update account properties"
        }
      };
    }

    const record = result.records[0];
    const updatedAccountID = record.get("accountID");
    const properties = record.get("properties");

    logger.info("Account updated successfully", {
      updatedAccountID,
      ownerID,
      dataToUpdate,
    });

    return {
      success: true,
      data: {
        accountID: updatedAccountID,
        accountProperties: properties
      },
      message: "Account updated successfully"
    };

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in UpdateAccountService", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      ownerID,
      accountID,
    });

    return {
      success: false,
      message: "Failed to update account",
      error: {
        code: handledError.code || "UPDATE_FAILED",
        details: handledError instanceof Error ? handledError.message : "An unknown error occurred"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting UpdateAccountService", { ownerID, accountID });
  }
}
