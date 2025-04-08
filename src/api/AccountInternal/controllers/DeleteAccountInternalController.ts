import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for handling the deletion of internal accounts
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function DeleteAccountInternalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();

  try {
    logger.info("DeleteAccountInternalController called", {
      controller: "DeleteAccountInternalController",
      body: req.body,
    });

    const { accountID } = req.body;
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

    // Check if the account has any assets linked to it
    const assetCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})<-[:CR|DR]-(:AssetMarker)
         RETURN count(*) AS assetCount`,
        { accountID }
      );
    });

    const assetCount = assetCheckResult.records[0].get("assetCount").toNumber();
    if (assetCount > 0) {
      throw new Error(
        "Cannot delete account with linked assets. Remove all assets first."
      );
    }

    // Delete the account
    const result = await session.executeWrite(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})-[r:OWNS]->(a:AccountInternal {id: $accountID})
         DELETE r, a
         RETURN m`,
        { memberID, accountID }
      );
    });

    if (result.records.length === 0) {
      throw new Error("Failed to delete internal account");
    }

    res.status(200).json({
      message: "Internal account deleted successfully",
      data: {
        action: {
          id: accountID,
          type: "ACCOUNT_INTERNAL_DELETED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            ownerID: memberID,
          },
        },
        dashboard: {
          // No account data to return since it was deleted
        },
      },
    });
  } catch (error) {
    logger.error("Error in DeleteAccountInternalController", {
      controller: "DeleteAccountInternalController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
