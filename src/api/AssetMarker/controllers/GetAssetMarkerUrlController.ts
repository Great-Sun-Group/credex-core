import { Request, Response, NextFunction } from "express";
import { logInfo, logError } from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getSignedS3Url } from "../../../services/s3Service";

/**
 * Controller for getting a pre-signed URL for an AssetMarker's S3 object
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetAssetMarkerUrlController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    const { assetID } = req.params;
    const memberID = req.user?.id;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    logInfo("GetAssetMarkerUrlController called", {
      controller: "GetAssetMarkerUrlController",
      assetID,
      memberID
    });

    // Get the AssetMarker from the database
    const assetMarkerResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AssetMarker {id: $assetID})
         RETURN a.s3Key AS s3Key, a.assetName AS assetName`,
        { assetID }
      );
    });

    if (assetMarkerResult.records.length === 0) {
      res.status(404).json({
        message: "AssetMarker not found",
        data: null
      });
      return;
    }

    const s3Key = assetMarkerResult.records[0].get("s3Key");
    const assetName = assetMarkerResult.records[0].get("assetName");

    if (!s3Key) {
      res.status(400).json({
        message: "AssetMarker does not have an S3 key",
        data: null
      });
      return;
    }

    // Generate a pre-signed URL for the S3 object
    const url = await getSignedS3Url(s3Key);

    res.status(200).json({
      message: "AssetMarker URL generated successfully",
      data: {
        url,
        assetID,
        assetName,
        s3Key,
        expiresIn: 3600 // 1 hour
      }
    });
  } catch (error) {
    logError("Error in GetAssetMarkerUrlController", error instanceof Error ? error : new Error(String(error)), {
      controller: "GetAssetMarkerUrlController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
