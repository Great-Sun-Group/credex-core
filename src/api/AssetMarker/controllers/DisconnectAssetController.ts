import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for handling the disconnection of assets from other nodes
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function DisconnectAssetController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("DisconnectAssetController called", {
      controller: "DisconnectAssetController",
      body: req.body,
    });

    const { assetID, connectedID, relName } = req.body;
    const memberID = req.user?.id;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the asset exists and is owned by the member
    const assetCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})-[:OWNS]->()-[:CR|DR]-(:AssetMarker {id: $assetID})
         RETURN count(*) AS assetCount`,
        { memberID, assetID }
      );
    });

    const assetCount = assetCheckResult.records[0].get("assetCount").toNumber();
    if (assetCount === 0) {
      throw new Error("Asset not found or not owned by the member");
    }

    // Check if the connected node exists and is owned by the member
    const connectedCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})-[:OWNS]->(n)
         WHERE n.id = $connectedID
         RETURN n`,
        { memberID, connectedID }
      );
    });

    if (connectedCheckResult.records.length === 0) {
      throw new Error("Connected node not found or not owned by the member");
    }

    // Check if the relationship exists
    const relCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AssetMarker {id: $assetID})-[r:${relName}]->(n {id: $connectedID})
         RETURN a, n, count(r) AS relCount`,
        { assetID, connectedID, relName }
      );
    });

    const relCount = relCheckResult.records[0].get("relCount").toNumber();
    if (relCount === 0) {
      throw new Error(`Relationship ${relName} does not exist between the asset and the connected node`);
    }

    const asset = relCheckResult.records[0].get("a").properties;
    const connected = relCheckResult.records[0].get("n").properties;

    // Delete the relationship
    const result = await session.executeWrite(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AssetMarker {id: $assetID})-[r:${relName}]->(n {id: $connectedID})
         DELETE r
         RETURN count(r) AS deletedCount`,
        { assetID, connectedID }
      );
    });

    const deletedCount = result.records[0].get("deletedCount").toNumber();
    if (deletedCount === 0) {
      throw new Error("Failed to delete relationship");
    }

    res.status(200).json({
      message: "Asset disconnected successfully",
      data: {
        action: {
          id: assetID,
          type: "ASSET_DISCONNECTED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            assetID,
            connectedID,
            relName,
            assetName: asset.assetName,
            connectedName: connected.name || connected.accountName || connected.assetName || "Unknown",
          },
        },
        dashboard: {
          asset: {
            id: assetID,
            assetName: asset.assetName,
          }
        },
      },
    });
  } catch (error) {
    logger.error("Error in DisconnectAssetController", {
      controller: "DisconnectAssetController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
