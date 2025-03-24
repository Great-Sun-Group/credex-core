import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { relationshipService } from "../../../services/relationships/relationshipService";

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
    const memberID = req.user?.memberID;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Use the relationshipService to disconnect the asset
    const { asset, connected } = await relationshipService.disconnectAsset(
      session,
      memberID,
      assetID,
      connectedID,
      relName
    );

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
