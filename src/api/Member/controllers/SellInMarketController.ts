import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for enabling or disabling vendor functionality for a member
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function SellInMarketController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("SellInMarketController called", {
      controller: "SellInMarketController",
      body: req.body,
    });

    const { vendor } = req.body;
    const memberID = req.user?.id;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the member exists
    const memberCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})
         RETURN m`,
        { memberID }
      );
    });

    if (memberCheckResult.records.length === 0) {
      throw new Error("Member not found");
    }

    // Update the member's vendor status
    const updateResult = await session.executeWrite(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})
         SET m.vendor = $vendor
         RETURN m`,
        { memberID, vendor }
      );
    });

    // If enabling vendor functionality, create required internal accounts if they don't exist
    interface AccountInfo {
      accountID: string;
      accountName: string;
      accountType: string;
    }
    
    let createdAccounts: AccountInfo[] = [];
    if (vendor) {
      const createAccountsResult = await session.executeWrite(async (tx: any) => {
        // Check if the required accounts already exist
        const existingAccountsResult = await tx.run(
          `MATCH (m:Member {id: $memberID})-[:OWNS]->(a:AccountInternal)
           WHERE a.accountName IN ["Onboarded Assets", "Profile Pictures"]
           RETURN a.id AS accountID, a.accountName AS accountName, a.accountType AS accountType`,
          { memberID }
        );

        const existingAccounts = existingAccountsResult.records.map((record: any) => ({
          accountID: record.get("accountID"),
          accountName: record.get("accountName"),
          accountType: record.get("accountType")
        }));

        // Create "Onboarded Assets" account if it doesn't exist
        if (!existingAccounts.some((a: AccountInfo) => a.accountName === "Onboarded Assets")) {
          const onboardedAssetsResult = await tx.run(
            `MATCH (m:Member {id: $memberID})
             CREATE (a:AccountInternal {
               id: apoc.create.uuid(),
               accountName: "Onboarded Assets",
               accountType: "PRODUCTION",
               createdAt: datetime()
             })
             CREATE (m)-[:OWNS]->(a)
             RETURN a.id AS accountID, a.accountName AS accountName, a.accountType AS accountType`,
            { memberID }
          );

          if (onboardedAssetsResult.records.length > 0) {
            createdAccounts.push({
              accountID: onboardedAssetsResult.records[0].get("accountID"),
              accountName: onboardedAssetsResult.records[0].get("accountName"),
              accountType: onboardedAssetsResult.records[0].get("accountType")
            });
          }
        }

        // Create "Profile Pictures" account if it doesn't exist
        if (!existingAccounts.some((a: AccountInfo) => a.accountName === "Profile Pictures")) {
          const profilePicturesResult = await tx.run(
            `MATCH (m:Member {id: $memberID})
             CREATE (a:AccountInternal {
               id: apoc.create.uuid(),
               accountName: "Profile Pictures",
               accountType: "DIGITAL_ASSET",
               createdAt: datetime()
             })
             CREATE (m)-[:OWNS]->(a)
             RETURN a.id AS accountID, a.accountName AS accountName, a.accountType AS accountType`,
            { memberID }
          );

          if (profilePicturesResult.records.length > 0) {
            createdAccounts.push({
              accountID: profilePicturesResult.records[0].get("accountID"),
              accountName: profilePicturesResult.records[0].get("accountName"),
              accountType: profilePicturesResult.records[0].get("accountType")
            });
          }
        }

        return existingAccounts.concat(createdAccounts);
      });

      createdAccounts = createAccountsResult as AccountInfo[];
    }

    res.status(200).json({
      message: `Vendor status ${vendor ? 'enabled' : 'disabled'} successfully`,
      data: {
        action: {
          id: memberID,
          type: "VENDOR_STATUS_UPDATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID,
            vendor,
            createdAccounts
          },
        },
        dashboard: {
          // Include relevant dashboard data here
          member: {
            id: memberID,
            vendor
          },
          createdAccounts
        },
      },
    });
  } catch (error) {
    logger.error("Error in SellInMarketController", {
      controller: "SellInMarketController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
