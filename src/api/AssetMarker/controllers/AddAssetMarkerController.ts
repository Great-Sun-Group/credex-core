import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { assetMarkerService, AccountAmount, AssetMarkerProps } from "../../../services/assetMarker/assetMarkerService";

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

    // Create asset marker properties
    const assetProps: AssetMarkerProps = {
      assetName,
      description,
      s3Key,
      denomination,
      assetMarkerData: AssetMarkerData
    };

    // Create the asset markers using the service
    const { assetIDs, glid } = await assetMarkerService.createMultipleAssetMarkers(
      session,
      assetProps,
      crAccounts as AccountAmount[],
      drAccounts as AccountAmount[]
    );

    // Calculate total amount
    const totalCR = crAccounts.reduce((sum: number, account: any) => sum + account.amount, 0);

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
            GLid: glid,
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
            GLid: glid,
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
