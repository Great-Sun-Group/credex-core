import { Request, Response, NextFunction } from "express";
import { logInfo, logError, logDebug } from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { generateS3Key, uploadToS3 } from "../../../services/s3Service";
import { imageProcessingService } from "../../../services/transformations/imageProcessingService";
import { assetMarkerService } from "../../../services/assetMarker/assetMarkerService";

/**
 * Controller for handling the upload and optimization of JPG images
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function UploadAndOptimizeJpgController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();

  try {
    // Log request info without the image data to avoid cluttering logs
    logInfo("UploadAndOptimizeJpgController called", {
      controller: "UploadAndOptimizeJpgController",
      requestId: req.id,
      memberID: req.user?.memberID,
      bodyParams: {
        name: req.body.name,
        drAccountID: req.body.drAccountID,
        crAccountID: req.body.crAccountID,
        imageSize: req.body.jpg
          ? Buffer.from(req.body.jpg, "base64").length
          : 0,
      },
    });

    const { jpg, name, drAccountID, crAccountID } = req.body;
    const memberID = req.user?.memberID;

    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the accounts exist and are owned by the member
    const accountIDs = [drAccountID];
    if (crAccountID) {
      accountIDs.push(crAccountID);
    }

    const accountCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a)
         WHERE a.id IN $accountIDs AND (a:Account OR a:AccountInternal)
         RETURN a.id AS accountID`,
        { memberID, accountIDs }
      );
    });

    const foundAccountIDs = accountCheckResult.records.map((record: any) =>
      record.get("accountID")
    );
    const missingAccountIDs = accountIDs.filter(
      (id: string) => !foundAccountIDs.includes(id)
    );

    if (missingAccountIDs.length > 0) {
      throw new Error(
        `Accounts not found or not owned by the member: ${missingAccountIDs.join(", ")}`
      );
    }

    // If crAccountID is not provided, find or create the "Onboarded Assets" account
    let finalCrAccountID = crAccountID;
    if (!finalCrAccountID) {
      finalCrAccountID =
        await assetMarkerService.findOrCreateOnboardedAssetsAccount(
          session,
          memberID
        );
    }

    // Process the JPG image (decode base64, optimize, and resize)
    const imageBuffer = Buffer.from(jpg, "base64");

    logDebug("Processing image", {
      controller: "UploadAndOptimizeJpgController",
      requestId: req.id,
      imageSize: imageBuffer.length,
      imageName: name,
    });

    // Process the image to create original, 200px, and 600px versions
    const { original, size200, size600 } =
      await imageProcessingService.processAssetMarkerImage(imageBuffer);

    logDebug("Image processed successfully", {
      controller: "UploadAndOptimizeJpgController",
      requestId: req.id,
      originalSize: original.length,
      size200Size: size200.length,
      size600Size: size600.length,
    });

    // Generate S3 keys
    const s3KeyOriginal = generateS3Key(`${memberID}/original`, `${name}.jpg`);
    const s3Key200 = generateS3Key(`${memberID}/200px`, `${name}.jpg`);
    const s3Key600 = generateS3Key(`${memberID}/600px`, `${name}.jpg`);

    // Upload images to S3
    logDebug("Uploading images to S3", {
      controller: "UploadAndOptimizeJpgController",
      requestId: req.id,
      s3Keys: {
        original: s3KeyOriginal,
        size200: s3Key200,
        size600: s3Key600,
      },
    });

    await uploadToS3(original, s3KeyOriginal, "image/jpeg");
    await uploadToS3(size200, s3Key200, "image/jpeg");
    await uploadToS3(size600, s3Key600, "image/jpeg");

    logDebug("Images uploaded to S3 successfully", {
      controller: "UploadAndOptimizeJpgController",
      requestId: req.id,
    });

    // Create the asset markers
    const { originalAssetID, asset200ID, asset600ID } =
      await assetMarkerService.createImageAssets(
        session,
        memberID,
        name,
        {
          original: s3KeyOriginal,
          size200: s3Key200,
          size600: s3Key600,
        },
        finalCrAccountID,
        drAccountID
      );

    res.status(201).json({
      message: "Image uploaded and optimized successfully",
      data: {
        action: {
          id: originalAssetID,
          type: "IMAGE_UPLOADED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            originalAssetID,
            asset200ID,
            asset600ID,
            assetName: name,
            s3KeyOriginal,
            s3Key200,
            s3Key600,
            drAccountID,
            crAccountID: finalCrAccountID,
          },
        },
        dashboard: {
          assets: [
            {
              id: originalAssetID,
              assetName: `${name} (Original)`,
              filename: `${name}_original.jpg`,
              s3Key: s3KeyOriginal,
              createdAt: new Date().toISOString(),
            },
            {
              id: asset200ID,
              assetName: `${name} (200px)`,
              filename: `${name}_200.jpg`,
              s3Key: s3Key200,
              createdAt: new Date().toISOString(),
            },
            {
              id: asset600ID,
              assetName: `${name} (600px)`,
              filename: `${name}_600.jpg`,
              s3Key: s3Key600,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
  } catch (error) {
    logError(
      "Error in UploadAndOptimizeJpgController",
      error instanceof Error ? error : new Error(String(error)),
      {
        controller: "UploadAndOptimizeJpgController",
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
