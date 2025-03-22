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

    // Generate a shared GLid for all related AssetMarkers
    const GLid = uuidv4();
    
    // Create separate AssetMarker nodes for each CR/DR pair
    const assetIDs: string[] = [];
    const result = await session.executeWrite(async (tx: any) => {
      let createAssetResult;
      
      // Ensure we have matching CR and DR accounts
      const maxPairs = Math.min(crAccounts.length, drAccounts.length);
      
      // Create a separate AssetMarker for each CR/DR pair
      for (let i = 0; i < maxPairs; i++) {
        const crAccount = crAccounts[i];
        const drAccount = drAccounts[i];
        const assetID = uuidv4();
        assetIDs.push(assetID);
        
        // Create the asset marker node with GLid
        createAssetResult = await tx.run(
          `CREATE (a:AssetMarker {
            id: $assetID,
            assetName: $assetName,
            description: $description,
            s3Key: $s3Key,
            GeneralLedgerAmount: $amount,
            CXXmultiplier: 1,
            Denomination: $denomination,
            GLid: $GLid,
            AssetMarkerData: $AssetMarkerData,
            createdAt: datetime()
          })
          RETURN a`,
          { 
            assetID, 
            assetName, 
            description: description || "", 
            s3Key: s3Key || "", 
            amount: crAccount.amount, 
            denomination,
            GLid,
            AssetMarkerData: AssetMarkerData ? JSON.stringify(AssetMarkerData) : "{}"
          }
        );
        
        // Create single CR relationship
        await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           MATCH (account) WHERE account.id = $accountID AND (account:Account OR account:AccountInternal)
           CREATE (account)-[r:CR {amount: $amount}]->(a)
           RETURN r`,
          { assetID, accountID: crAccount.accountID, amount: crAccount.amount }
        );
        
        // Create single DR relationship
        await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           MATCH (account) WHERE account.id = $accountID AND (account:Account OR account:AccountInternal)
           CREATE (a)-[r:DR {amount: $amount}]->(account)
           RETURN r`,
          { assetID, accountID: drAccount.accountID, amount: drAccount.amount }
        );
      }
      
      // If there are remaining CR accounts without matching DR accounts
      for (let i = maxPairs; i < crAccounts.length; i++) {
        const crAccount = crAccounts[i];
        const assetID = uuidv4();
        assetIDs.push(assetID);
        
        // Create the asset marker node
        createAssetResult = await tx.run(
          `CREATE (a:AssetMarker {
            id: $assetID,
            assetName: $assetName,
            description: $description,
            s3Key: $s3Key,
            GeneralLedgerAmount: $amount,
            CXXmultiplier: 1,
            Denomination: $denomination,
            GLid: $GLid,
            AssetMarkerData: $AssetMarkerData,
            createdAt: datetime()
          })
          RETURN a`,
          { 
            assetID, 
            assetName, 
            description: description || "", 
            s3Key: s3Key || "", 
            amount: crAccount.amount, 
            denomination,
            GLid,
            AssetMarkerData: AssetMarkerData ? JSON.stringify(AssetMarkerData) : "{}"
          }
        );
        
        // Create single CR relationship
        await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           MATCH (account) WHERE account.id = $accountID AND (account:Account OR account:AccountInternal)
           CREATE (account)-[r:CR {amount: $amount}]->(a)
           RETURN r`,
          { assetID, accountID: crAccount.accountID, amount: crAccount.amount }
        );
      }
      
      // If there are remaining DR accounts without matching CR accounts
      for (let i = maxPairs; i < drAccounts.length; i++) {
        const drAccount = drAccounts[i];
        const assetID = uuidv4();
        assetIDs.push(assetID);
        
        // Create the asset marker node
        createAssetResult = await tx.run(
          `CREATE (a:AssetMarker {
            id: $assetID,
            assetName: $assetName,
            description: $description,
            s3Key: $s3Key,
            GeneralLedgerAmount: $amount,
            CXXmultiplier: 1,
            Denomination: $denomination,
            GLid: $GLid,
            AssetMarkerData: $AssetMarkerData,
            createdAt: datetime()
          })
          RETURN a`,
          { 
            assetID, 
            assetName, 
            description: description || "", 
            s3Key: s3Key || "", 
            amount: drAccount.amount, 
            denomination,
            GLid,
            AssetMarkerData: AssetMarkerData ? JSON.stringify(AssetMarkerData) : "{}"
          }
        );
        
        // Create single DR relationship
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
      message: "Asset markers created successfully",
      data: {
        action: {
          id: assetIDs[0], // Use the first asset ID as the primary ID
          type: "ASSET_MARKER_CREATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            assetIDs,
            GLid,
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
            id: assetIDs[0], // Use the first asset ID as the primary ID
            GLid,
            assetName,
            description: description || "",
            s3Key: s3Key || "",
            totalAmount: totalCR,
            denomination,
            createdAt: new Date().toISOString(),
            assetCount: assetIDs.length
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
