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
      user: req.user,
      headers: req.headers,
      requestId: req.id
    });

    const memberID = req.user?.memberID;

    logger.info("User info", {
      controller: "ConnectAssetController",
      memberID,
      user: req.user,
      requestId: req.id
    });

    if (!memberID) {
      logger.error("User ID not found in request", {
        controller: "ConnectAssetController",
        user: req.user,
        requestId: req.id
      });
      throw new Error("User ID not found in request");
    }

    // Check if we're dealing with a single connection or multiple connections
    if (req.body.connections && Array.isArray(req.body.connections)) {
      // Handle multiple connections
      const { connections } = req.body;
      
      if (connections.length === 0) {
        throw new Error("No connections provided");
      }

      // Use the relationshipService to connect multiple assets
      const results = await relationshipService.connectMultipleAssets(
        session,
        memberID,
        connections
      );

      // Count successful connections
      const successfulConnections = results.filter(r => !('error' in r));
      const failedConnections = results.filter(r => 'error' in r);

      res.status(200).json({
        message: `Connected ${successfulConnections.length} assets successfully${failedConnections.length > 0 ? `, ${failedConnections.length} failed` : ''}`,
        data: {
          action: {
            id: memberID,
            type: "MULTIPLE_ASSETS_CONNECTED",
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              totalConnections: connections.length,
              successfulConnections: successfulConnections.length,
              failedConnections: failedConnections.length,
              connections: results.map(r => ({
                assetID: r.asset.id,
                connectedID: r.connected.id,
                relName: r.relType,
                success: !('error' in r),
                error: 'error' in r ? r.error : undefined
              }))
            },
          },
          dashboard: {
            connections: results.map(r => ({
              assetID: r.asset.id,
              connectedID: r.connected.id,
              relName: r.relType,
              success: !('error' in r),
              assetName: r.asset.assetName,
              connectedName: r.connected.name || r.connected.accountName || r.connected.assetName || "Unknown"
            }))
          },
        },
      });
    } else {
      // Handle single connection (backward compatibility)
      const { assetID, connectedID, relName } = req.body;
      
      if (!assetID || !connectedID || !relName) {
        throw new Error("Missing required parameters: assetID, connectedID, or relName");
      }

      // Use the relationshipService to connect the asset
      const { asset, connected, relType } =
        await relationshipService.connectAsset(
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
              connectedName:
                connected.name ||
                connected.accountName ||
                connected.assetName ||
                "Unknown",
            },
          },
          dashboard: {
            asset: {
              id: assetID,
              assetName: asset.assetName,
              connections: [
                {
                  id: connectedID,
                  name:
                    connected.name ||
                    connected.accountName ||
                    connected.assetName ||
                    "Unknown",
                  relName,
                },
              ],
            },
          },
        },
      });
    }
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
