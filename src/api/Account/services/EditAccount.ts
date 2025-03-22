import { ManagedTransaction } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { AccountError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { ServiceResult } from "../../../types/apiResponse";
import { AccountData } from "../repositories/AccountRepository";

interface EditAccountParams {
  accountID: string;
  accountName?: string;
  accountHandle?: string;
  defaultDenom?: string;
}

interface EditAccountResult {
  accountID: string;
  accountName: string;
  accountHandle: string;
  defaultDenom: string;
}

/**
 * Service to update an existing exchange account
 */
export async function editAccount(
  params: EditAccountParams,
  memberID: string
): Promise<ServiceResult<EditAccountResult>> {
  const { accountID, accountName, accountHandle, defaultDenom } = params;
  const session = ledgerSpaceDriver.session();

  try {
    // Check if the member has access to the account
    const accessCheckResult = await session.executeRead(
      async (tx: ManagedTransaction) => {
        const query = `
          MATCH (member:Member {memberID: $memberID})
          MATCH (account:Account {accountID: $accountID})
          RETURN 
            EXISTS((member)-[:AUTHORIZED_FOR]->(account)) as hasAccess,
            account.accountName as currentName,
            account.accountHandle as currentHandle,
            account.defaultDenom as currentDenom
        `;
        const result = await tx.run(query, { memberID, accountID });
        return result.records[0];
      }
    );

    if (!accessCheckResult) {
      return {
        success: false,
        message: "Account not found",
        error: {
          code: String(ErrorCodes.Account.NOT_FOUND),
        },
      };
    }

    const hasAccess = accessCheckResult.get("hasAccess");
    if (!hasAccess) {
      return {
        success: false,
        message: "You are not authorized to edit this account",
        error: {
          code: String(ErrorCodes.Account.UNAUTHORIZED),
        },
      };
    }

    // Check if the account handle is unique if it's being updated
    if (accountHandle) {
      const handleCheckResult = await session.executeRead(
        async (tx: ManagedTransaction) => {
          const query = `
            MATCH (account:Account {accountHandle: $accountHandle})
            WHERE account.accountID <> $accountID
            RETURN account.accountID as existingAccountID
          `;
          const result = await tx.run(query, { accountHandle, accountID });
          return result.records[0];
        }
      );

      if (handleCheckResult) {
        return {
          success: false,
          message: "Account handle already in use",
          error: {
            code: String(ErrorCodes.Account.DUPLICATE_HANDLE),
          },
        };
      }
    }

    // Update the account
    const updateResult = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Build the SET clause dynamically based on provided parameters
        const setClause = [];
        const params: Record<string, any> = { accountID };

        if (accountName) {
          setClause.push("account.accountName = $accountName");
          params.accountName = accountName;
        }

        if (accountHandle) {
          setClause.push("account.accountHandle = $accountHandle");
          params.accountHandle = accountHandle;
        }

        if (defaultDenom) {
          setClause.push("account.defaultDenom = $defaultDenom");
          params.defaultDenom = defaultDenom;
        }

        // If no fields to update, return current values
        if (setClause.length === 0) {
          return {
            accountID,
            accountName: accessCheckResult.get("currentName"),
            accountHandle: accessCheckResult.get("currentHandle"),
            defaultDenom: accessCheckResult.get("currentDenom"),
          };
        }

        const query = `
          MATCH (account:Account {accountID: $accountID})
          SET ${setClause.join(", ")}
          RETURN 
            account.accountID as accountID,
            account.accountName as accountName,
            account.accountHandle as accountHandle,
            account.defaultDenom as defaultDenom
        `;

        const result = await tx.run(query, params);
        return {
          accountID: result.records[0].get("accountID"),
          accountName: result.records[0].get("accountName"),
          accountHandle: result.records[0].get("accountHandle"),
          defaultDenom: result.records[0].get("defaultDenom"),
        };
      }
    );

    logger.info("Account updated successfully", {
      accountID,
      memberID,
      updatedFields: {
        accountName: accountName !== undefined,
        accountHandle: accountHandle !== undefined,
        defaultDenom: defaultDenom !== undefined,
      },
    });

    return {
      success: true,
      message: "Account updated successfully",
      data: updateResult,
    };
  } catch (error) {
    logger.error("Error updating account", {
      error: error instanceof Error ? error.message : "Unknown error",
      accountID,
      memberID,
    });

    return {
      success: false,
      message: "Failed to update account",
      error: {
        code: String(ErrorCodes.Admin.INTERNAL_ERROR),
        details: error instanceof Error ? error.message : "Unknown error",
      },
    };
  } finally {
    await session.close();
  }
}
