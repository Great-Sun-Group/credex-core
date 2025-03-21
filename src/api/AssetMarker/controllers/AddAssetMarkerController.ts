import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { v4 as uuidv4 } from "uuid";

/**
 * Controller for handling the creation of asset markers with multiple CR/DR relationships
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function AddAssetMarkerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("AddAssetMarkerController called", {
      controller: "AddAssetMarkerController",
      body: req.body,
    });

    const { 
      assetName, 
      description, 
      s3Key, 
      crAccounts, 
      drAccounts, 
      denomination = "USD", 
      AssetMarkerData 
    } = req.body;
    
    const memberID = req.user?.id;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Validate that the sum of CR amounts equals the sum of DR amounts
    const totalCR = crAccounts.reduce((sum: number, account: any) => sum + account.amount, 0);
    const totalDR = drAccounts.reduce((sum: number, account: any) => sum + account.amount, 0);
    
    if (totalCR !== totalDR) {
      throw new Error(`CR total (${totalCR}) must equal DR total (${totalDR})`);
    }

    // Check if all accounts exist and are owned by the member
    const accountIDs = [
      ...crAccounts.map((a: any) => a.accountID),
      ...drAccounts.map((a: any) => a.accountID)
    ];
    
    const accountCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})-[:OWNS]->(a)
         WHERE a.id IN $accountIDs AND (a:Account OR a:AccountInternal)
         RETURN a.id AS accountID`,
        { memberID, accountIDs }
      );
    });

    const foundAccountIDs = accountCheckResult.records.map((record: any) => record.get("accountID"));
    const missingAccountIDs = accountIDs.filter((id: string) => !foundAccountIDs.includes(id));
    
    if (missingAccountIDs.length > 0) {
      throw new Error(`Accounts not found or not owned by the member: ${missingAccountIDs.join(", ")}`);
    }

    // Create the asset marker with CR and DR relationships
    const assetID = uuidv4();
    const result = await session.executeWrite(async (tx: any) => {
      // Create the asset marker node
      const createAssetResult = await tx.run(
        `CREATE (a:AssetMarker {
          id: $assetID,
          assetName: $assetName,
          description: $description,
          s3Key: $s3Key,
          GeneralLedgerAmount: $totalAmount,
          CXXmultiplier: 1,
          Denomination: $denomination,
          AssetMarkerData: $AssetMarkerData,
          createdAt: datetime()
        })
        RETURN a`,
        { 
          assetID, 
          assetName, 
          description: description || "", 
          s3Key: s3Key || "", 
          totalAmount: totalCR, 
          denomination,
          AssetMarkerData: AssetMarkerData ? JSON.stringify(AssetMarkerData) : "{}"
        }
      );

      // Create CR relationships
      for (const crAccount of crAccounts) {
        await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           MATCH (account) WHERE account.id = $accountID AND (account:Account OR account:AccountInternal)
           CREATE (account)-[r:CR {amount: $amount}]->(a)
           RETURN r`,
          { assetID, accountID: crAccount.accountID, amount: crAccount.amount }
        );
      }

      // Create DR relationships
      for (const drAccount of drAccounts) {
        await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           MATCH (account) WHERE account.id = $accountID AND (account:Account OR account:AccountInternal)
           CREATE (a)-[r:DR {amount: $amount}]->(account)
           RETURN r`,
          { assetID, accountID: drAccount.accountID, amount: drAccount.amount }
        );
      }

      return createAssetResult;
    });

    if (result.records.length === 0) {
      throw new Error("Failed to create asset marker");
    }

    const asset = result.records[0].get("a").properties;

    res.status(201).json({
      message: "Asset marker created successfully",
      data: {
        action: {
          id: assetID,
          type: "ASSET_MARKER_CREATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            assetID,
            assetName,
            description: description || "",
            s3Key: s3Key || "",
            totalAmount: totalCR,
            denomination,
            crAccounts,
            drAccounts,
            createdAt: new Date().toISOString(),
          },
        },
        dashboard: {
          asset: {
            id: assetID,
            assetName,
            description: description || "",
            s3Key: s3Key || "",
            totalAmount: totalCR,
            denomination,
            createdAt: new Date().toISOString(),
          }
        },
      },
    });
  } catch (error) {
    logger.error("Error in AddAssetMarkerController", {
      controller: "AddAssetMarkerController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
