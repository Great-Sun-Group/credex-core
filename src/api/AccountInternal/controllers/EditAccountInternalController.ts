import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for handling the editing of internal accounts
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function EditAccountInternalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();

  try {
    logger.info("EditAccountInternalController called", {
      controller: "EditAccountInternalController",
      body: req.body,
    });

    const { accountID, accountName, accountHandle, accountDescription } =
      req.body;
    const memberID = req.user?.memberID;

    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the account exists and is owned by the member
    const accountCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})-[:OWNS]->(a:AccountInternal {id: $accountID})
         RETURN a`,
        { memberID, accountID }
      );
    });

    if (accountCheckResult.records.length === 0) {
      throw new Error("Account not found or not owned by the member");
    }

    // Check if the account handle is already in use by another account
    if (accountHandle) {
      const handleCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AccountInternal {accountHandle: $accountHandle})
           WHERE a.id <> $accountID
           RETURN a`,
          { accountHandle, accountID }
        );
      });

      if (handleCheckResult.records.length > 0) {
        throw new Error("Account handle is already in use");
      }
    }

    // Build the update query dynamically based on provided fields
    let setClause = [];
    const params: Record<string, any> = { accountID };

    if (accountName) {
      setClause.push("a.accountName = $accountName");
      params.accountName = accountName;
    }

    if (accountHandle) {
      setClause.push("a.accountHandle = $accountHandle");
      params.accountHandle = accountHandle;
    }

    if (accountDescription !== undefined) {
      setClause.push("a.accountDescription = $accountDescription");
      params.accountDescription = accountDescription;
    }

    // Execute the update query
    const result = await session.executeWrite(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})
         SET ${setClause.join(", ")}
         RETURN a`,
        params
      );
    });

    if (result.records.length === 0) {
      throw new Error("Failed to update internal account");
    }

    const account = result.records[0].get("a").properties;

    res.status(200).json({
      message: "Internal account updated successfully",
      data: {
        action: {
          id: accountID,
          type: "ACCOUNT_INTERNAL_UPDATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            accountName: account.accountName,
            accountHandle: account.accountHandle,
            accountDescription: account.accountDescription,
            ownerID: memberID,
          },
        },
        dashboard: {
          account: {
            id: accountID,
            accountName: account.accountName,
            accountHandle: account.accountHandle,
            accountDescription: account.accountDescription,
            ownerID: memberID,
          },
        },
      },
    });
  } catch (error) {
    logger.error("Error in EditAccountInternalController", {
      controller: "EditAccountInternalController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
