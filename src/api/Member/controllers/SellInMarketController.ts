import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { CreateAccountService } from "../../Account/services/CreateAccount";

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

    const { vendor, storeAccountName, storeAccountHandle } = req.body;
    const memberID = req.user?.memberID;

    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the member exists
    const memberCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})
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
        `MATCH (m:Member {memberID: $memberID})
         SET m.activateMarket = $vendor
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
      const createAccountsResult = await session.executeWrite(
        async (tx: any) => {
          // Check if the required accounts already exist
          logger.info("Checking for existing internal accounts", {
            memberID,
            accountNames: ["Onboarded Assets", "Profile Pictures"]
          });
          
          const existingAccountsResult = await tx.run(
            `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a:AccountInternal)
           WHERE a.accountName IN ["Onboarded Assets", "Profile Pictures"]
           RETURN a.id AS accountID, a.accountName AS accountName, a.accountType AS accountType`,
            { memberID }
          );
          
          logger.info("Existing accounts query result", {
            recordCount: existingAccountsResult.records.length
          });

          const existingAccounts = existingAccountsResult.records.map(
            (record: any) => ({
              accountID: record.get("accountID"),
              accountName: record.get("accountName"),
              accountType: record.get("accountType"),
            })
          );

          // Create "Onboarded Assets" account if it doesn't exist
          if (
            !existingAccounts.some(
              (a: AccountInfo) => a.accountName === "Onboarded Assets"
            )
          ) {
            logger.info("Creating Onboarded Assets account", { memberID });
            
            const onboardedAssetsResult = await tx.run(
              `MATCH (m:Member {memberID: $memberID})
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
            
            logger.info("Onboarded Assets account creation result", {
              success: onboardedAssetsResult.records.length > 0
            });

            if (onboardedAssetsResult.records.length > 0) {
              createdAccounts.push({
                accountID: onboardedAssetsResult.records[0].get("accountID"),
                accountName:
                  onboardedAssetsResult.records[0].get("accountName"),
                accountType:
                  onboardedAssetsResult.records[0].get("accountType"),
              });
            }
          }

          // Create "Profile Pictures" account if it doesn't exist
          if (
            !existingAccounts.some(
              (a: AccountInfo) => a.accountName === "Profile Pictures"
            )
          ) {
            logger.info("Creating Profile Pictures account", { memberID });
            
            const profilePicturesResult = await tx.run(
              `MATCH (m:Member {memberID: $memberID})
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
            
            logger.info("Profile Pictures account creation result", {
              success: profilePicturesResult.records.length > 0
            });

            if (profilePicturesResult.records.length > 0) {
              createdAccounts.push({
                accountID: profilePicturesResult.records[0].get("accountID"),
                accountName:
                  profilePicturesResult.records[0].get("accountName"),
                accountType:
                  profilePicturesResult.records[0].get("accountType"),
              });
            }
          }

          return existingAccounts.concat(createdAccounts);
        }
      );

      createdAccounts = createAccountsResult as AccountInfo[];
      
      // Create OPERATIONS account if storeAccountName and storeAccountHandle are provided
      if (storeAccountName && storeAccountHandle) {
        logger.info("Creating OPERATIONS account for vendor", {
          memberID,
          storeAccountName,
          storeAccountHandle
        });
        
        // Check if an OPERATIONS account with this handle already exists
        const operationsAccountCheck = await session.executeRead(async (tx: any) => {
          return await tx.run(
            `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a:Account)
             WHERE a.accountType = "OPERATIONS" AND a.accountHandle = $storeAccountHandle
             RETURN a.accountID AS accountID, a.accountName AS accountName, a.accountType AS accountType`,
            { memberID, storeAccountHandle }
          );
        });
        
        // Only create if it doesn't exist
        if (operationsAccountCheck.records.length === 0) {
          try {
            // Use CreateAccountService to create the OPERATIONS account
            const createResult = await CreateAccountService(
              memberID,
              "OPERATIONS",
              storeAccountName,
              storeAccountHandle,
              "CXX", // Default denomination
              null,  // No DCO give
              null   // No DCO denomination
            );
            
            if (createResult.success && createResult.data) {
              logger.info("OPERATIONS account created successfully", {
                accountID: createResult.data.accountID,
                accountName: storeAccountName,
                accountHandle: storeAccountHandle
              });
              
              // Add to createdAccounts array
              createdAccounts.push({
                accountID: createResult.data.accountID,
                accountName: storeAccountName,
                accountType: "OPERATIONS"
              });
            } else {
              logger.error("Failed to create OPERATIONS account", {
                error: createResult.message,
                code: createResult.error?.code
              });
            }
          } catch (error) {
            logger.error("Error creating OPERATIONS account", {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            });
          }
        } else {
          logger.info("OPERATIONS account already exists", {
            accountID: operationsAccountCheck.records[0].get("accountID"),
            accountName: operationsAccountCheck.records[0].get("accountName")
          });
          
          // Add existing account to the response
          createdAccounts.push({
            accountID: operationsAccountCheck.records[0].get("accountID"),
            accountName: operationsAccountCheck.records[0].get("accountName"),
            accountType: operationsAccountCheck.records[0].get("accountType")
          });
        }
      } else if (vendor) {
        logger.warn("Vendor functionality enabled but storeAccountName and/or storeAccountHandle not provided", {
          storeAccountName,
          storeAccountHandle
        });
      }
    }

    res.status(200).json({
      message: `Vendor status ${vendor ? "enabled" : "disabled"} successfully`,
      data: {
        action: {
          id: memberID,
          type: "VENDOR_STATUS_UPDATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID,
            vendor,
            createdAccounts,
          },
        },
        dashboard: {
          // Include relevant dashboard data here
          member: {
            id: memberID,
            vendor,
          },
          createdAccounts,
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
