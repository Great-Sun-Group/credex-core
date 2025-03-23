import { Request, Response, NextFunction } from "express";
import { logInfo, logError } from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { v4 as uuidv4 } from "uuid";
import { uploadToS3, generateS3Key } from "../../../services/s3Service";
import { processAssetMarkerImage } from "../../../services/imageService";

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
    logInfo("UploadAndOptimizeJpgController called", {
      controller: "UploadAndOptimizeJpgController",
      body: {
        ...req.body,
        jpg: req.body.jpg ? "Binary data (truncated)" : undefined
      },
    });

    const { jpg, name, drAccountID, crAccountID } = req.body;
    const memberID = req.user?.id;
    
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

    // If crAccountID is not provided, find or create the "Onboarded Assets" account
    let finalCrAccountID = crAccountID;
    if (!finalCrAccountID) {
      const onboardedAssetsResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {id: $memberID})-[:OWNS]->(a:AccountInternal {accountName: "Onboarded Assets"})
           RETURN a.id AS accountID`,
          { memberID }
        );
      });

      if (onboardedAssetsResult.records.length > 0) {
        finalCrAccountID = onboardedAssetsResult.records[0].get("accountID");
      } else {
        // Create the "Onboarded Assets" account
        const createAccountResult = await session.executeWrite(async (tx: any) => {
          return await tx.run(
            `MATCH (m:Member {id: $memberID})
             CREATE (a:AccountInternal {
               id: apoc.create.uuid(),
               accountName: "Onboarded Assets",
               accountType: "PRODUCTION",
               createdAt: datetime()
             })
             CREATE (m)-[:OWNS]->(a)
             RETURN a.id AS accountID`,
            { memberID }
          );
        });

        if (createAccountResult.records.length > 0) {
          finalCrAccountID = createAccountResult.records[0].get("accountID");
        } else {
          throw new Error("Failed to create Onboarded Assets account");
        }
      }
    }

    // Process the JPG image (decode base64, optimize, and resize)
    const imageBuffer = Buffer.from(jpg, "base64");
    
    // Process the image to create original, 200px, and 600px versions
    const { original, size200, size600 } = await processAssetMarkerImage(imageBuffer);
    
    // Create asset marker IDs
    const originalAssetID = uuidv4();
    const asset200ID = uuidv4();
    const asset600ID = uuidv4();
    
    // Generate S3 keys
    const s3KeyOriginal = generateS3Key(`${memberID}/original`, `${name}.jpg`);
    const s3Key200 = generateS3Key(`${memberID}/200px`, `${name}.jpg`);
    const s3Key600 = generateS3Key(`${memberID}/600px`, `${name}.jpg`);
    
    // Upload images to S3
    await uploadToS3(original, s3KeyOriginal, "image/jpeg");
    await uploadToS3(size200, s3Key200, "image/jpeg");
    await uploadToS3(size600, s3Key600, "image/jpeg");

    // Create the original asset marker
    await session.executeWrite(async (tx: any) => {
      // Create the original asset marker node
      await tx.run(
        `CREATE (a:AssetMarker {
          id: $assetID,
          assetName: $assetName,
          filename: $filename,
          s3Key: $s3Key,
          GeneralLedgerAmount: 1,
          CXXmultiplier: 1,
          Denomination: "USD",
          createdAt: datetime()
        })
        WITH a
        MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
        MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
        CREATE (cr)-[:CR {amount: 1}]->(a)-[:DR {amount: 1}]->(dr)
        RETURN a`,
        { 
          assetID: originalAssetID, 
          assetName: `${name} (Original)`, 
          filename: `${name}_original.jpg`,
          s3Key: s3KeyOriginal,
          crAccountID: finalCrAccountID,
          drAccountID
        }
      );

      // Create the 200px asset marker node
      await tx.run(
        `CREATE (a:AssetMarker {
          id: $assetID,
          assetName: $assetName,
          filename: $filename,
          s3Key: $s3Key,
          GeneralLedgerAmount: 1,
          CXXmultiplier: 1,
          Denomination: "USD",
          createdAt: datetime()
        })
        WITH a
        MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
        MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
        MATCH (original:AssetMarker {id: $originalAssetID})
        CREATE (cr)-[:CR {amount: 1}]->(a)-[:DR {amount: 1}]->(dr)
        CREATE (original)-[:USED_IN]->(a)
        RETURN a`,
        { 
          assetID: asset200ID, 
          assetName: `${name} (200px)`, 
          filename: `${name}_200.jpg`,
          s3Key: s3Key200,
          crAccountID: finalCrAccountID,
          drAccountID,
          originalAssetID
        }
      );

      // Create the 600px asset marker node
      await tx.run(
        `CREATE (a:AssetMarker {
          id: $assetID,
          assetName: $assetName,
          filename: $filename,
          s3Key: $s3Key,
          GeneralLedgerAmount: 1,
          CXXmultiplier: 1,
          Denomination: "USD",
          createdAt: datetime()
        })
        WITH a
        MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
        MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
        MATCH (original:AssetMarker {id: $originalAssetID})
        CREATE (cr)-[:CR {amount: 1}]->(a)-[:DR {amount: 1}]->(dr)
        CREATE (original)-[:USED_IN]->(a)
        RETURN a`,
        { 
          assetID: asset600ID, 
          assetName: `${name} (600px)`, 
          filename: `${name}_600.jpg`,
          s3Key: s3Key600,
          crAccountID: finalCrAccountID,
          drAccountID,
          originalAssetID
        }
      );
    });

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
            }
          ]
        },
      },
    });
  } catch (error) {
    logError("Error in UploadAndOptimizeJpgController", error instanceof Error ? error : new Error(String(error)), {
      controller: "UploadAndOptimizeJpgController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
