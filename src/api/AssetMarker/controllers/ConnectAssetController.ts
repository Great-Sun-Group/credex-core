import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { relationshipService } from "../../../services/relationships/relationshipService";

/**
 * Controller for handling the connection of assets to other nodes
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function ConnectAssetController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("ConnectAssetController called", {
      controller: "ConnectAssetController",
      body: req.body,
    });

    const { assetID, connectedID, relName } = req.body;
    const memberID = req.user?.id;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Use the relationshipService to connect the asset
    const { asset, connected, relType } = await relationshipService.connectAsset(
      session,
      memberID,
      assetID,
      connectedID,
      relName
    );

    res.status(200).json({
      message: "Asset connected successfully",
      data: {
        action: {
          id: assetID,
          type: "ASSET_CONNECTED",
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
            connections: [
              {
                id: connectedID,
                name: connected.name || connected.accountName || connected.assetName || "Unknown",
                relName
              }
            ]
          }
        },
      },
    });
  } catch (error) {
    logger.error("Error in ConnectAssetController", {
      controller: "ConnectAssetController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
