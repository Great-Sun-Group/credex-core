import { Request, Response, NextFunction } from "express";
import { logInfo, logError, logDebug } from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { relationshipService } from "../../../services/relationships/relationshipService";

/**
 * Controller for updating profile pictures for a source (Member, Account, or AccountInternal)
 * This controller handles the complex process of:
 * 1. Finding existing profile picture relationships
 * 2. Disconnecting those relationships
 * 3. Connecting new assets with the appropriate relationship types
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function UpdateProfilePicsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();

  try {
    logInfo("UpdateProfilePicsController called", {
      controller: "UpdateProfilePicsController",
      requestId: req.id,
      memberID: req.user?.memberID,
      bodyParams: req.body,
    });

    const {
      sourceID,
      originalAssetID,
      thumbnailAssetID,
      asset200ID,
      asset600ID,
    } = req.body;
    const memberID = req.user?.memberID;

    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Define the relationship types we're working with
    const relationshipTypes = [
      "PROFILE_PIC_ORIGINAL_JPG",
      "PROFILE_PIC_THUMBNAIL_JPG",
      "PROFILE_PIC_200_JPG",
      "PROFILE_PIC_600_JPG",
    ];

    // Step 1: Find existing profile picture relationships
    const existingRelationships = [];

    for (const relType of relationshipTypes) {
      // Find assets connected to the source with this relationship type
      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (source)-[:${relType}]->(asset:AssetMarker)
           WHERE source.id = $sourceID OR source.memberID = $sourceID OR source.accountID = $sourceID
           RETURN asset.id AS assetID`,
          { sourceID }
        );
      });

      // Add any found relationships to our list
      for (const record of result.records) {
        const assetID = record.get("assetID");
        existingRelationships.push({
          assetID,
          connectedID: sourceID,
          relName: relType,
        });
      }
    }

    logDebug(
      `Found ${existingRelationships.length} existing profile picture relationships`,
      {
        controller: "UpdateProfilePicsController",
        requestId: req.id,
        existingRelationships,
      }
    );

    // Step 2: Disconnect existing relationships
    const disconnectResults = [];

    for (const rel of existingRelationships) {
      try {
        const result = await relationshipService.disconnectAsset(
          session,
          memberID,
          rel.assetID,
          rel.connectedID,
          rel.relName
        );

        disconnectResults.push({
          assetID: rel.assetID,
          connectedID: rel.connectedID,
          relName: rel.relName,
          success: true,
        });

        logDebug(`Disconnected relationship: ${rel.relName}`, {
          controller: "UpdateProfilePicsController",
          requestId: req.id,
          assetID: rel.assetID,
          connectedID: rel.connectedID,
          relName: rel.relName,
        });
      } catch (error) {
        logError(
          `Error disconnecting relationship: ${rel.relName}`,
          error instanceof Error ? error : new Error(String(error)),
          {
            controller: "UpdateProfilePicsController",
            requestId: req.id,
            assetID: rel.assetID,
            connectedID: rel.connectedID,
            relName: rel.relName,
            error: error instanceof Error ? error.message : String(error),
          }
        );

        disconnectResults.push({
          assetID: rel.assetID,
          connectedID: rel.connectedID,
          relName: rel.relName,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Step 3: Connect new assets with appropriate relationship types
    // The relationship direction should be Source -> AssetMarker
    const connections = [
      {
        assetID: sourceID,
        connectedID: originalAssetID,
        relName: "PROFILE_PIC_ORIGINAL_JPG",
      },
      {
        assetID: sourceID,
        connectedID: thumbnailAssetID,
        relName: "PROFILE_PIC_THUMBNAIL_JPG",
      },
      {
        assetID: sourceID,
        connectedID: asset200ID,
        relName: "PROFILE_PIC_200_JPG",
      },
      {
        assetID: sourceID,
        connectedID: asset600ID,
        relName: "PROFILE_PIC_600_JPG",
      },
    ];

    logDebug(
      `Connecting ${connections.length} new profile picture relationships`,
      {
        controller: "UpdateProfilePicsController",
        requestId: req.id,
        connections,
      }
    );

    const connectResults = await relationshipService.connectMultipleAssets(
      session,
      memberID,
      connections
    );

    // Prepare the response
    res.status(200).json({
      message: "Profile pictures updated successfully",
      data: {
        action: {
          id: sourceID,
          type: "PROFILE_PICS_UPDATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            sourceID,
            originalAssetID,
            thumbnailAssetID,
            asset200ID,
            asset600ID,
            disconnected: disconnectResults,
            connected: connectResults.map((r) => ({
              assetID: r.asset.id,
              connectedID: r.connected.id,
              relName: r.relType,
              success: !("error" in r),
              error: "error" in r ? r.error : undefined,
            })),
          },
        },
        dashboard: {
          profilePics: {
            sourceID,
            originalAssetID,
            thumbnailAssetID,
            asset200ID,
            asset600ID,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });
  } catch (error) {
    logError(
      "Error in UpdateProfilePicsController",
      error instanceof Error ? error : new Error(String(error)),
      {
        controller: "UpdateProfilePicsController",
        requestId: req.id,
        memberID: req.user?.memberID,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
    next(error);
  } finally {
    await session.close();
  }
}
