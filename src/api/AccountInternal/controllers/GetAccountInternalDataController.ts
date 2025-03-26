import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for retrieving detailed account internal data for public view
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetAccountInternalDataController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("GetAccountInternalDataController called", {
      controller: "GetAccountInternalDataController",
      params: req.params,
    });

    const { accountID } = req.params;
    const memberID = req.user?.memberID;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the account exists
    const accountCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})
         OPTIONAL MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a)
         RETURN a, m IS NOT NULL as isOwner`,
        { accountID, memberID }
      );
    });

    if (accountCheckResult.records.length === 0) {
      throw new Error("Account not found");
    }

    const account = accountCheckResult.records[0].get("a").properties;
    const isOwner = accountCheckResult.records[0].get("isOwner");

    // Get account details and profile pictures
    const accountDetailsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})
         OPTIONAL MATCH (a)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:Asset)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:Asset)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_200_JPG]->(pic200:Asset)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_600_JPG]->(pic600:Asset)
         OPTIONAL MATCH (owner:Member)-[:OWNS]->(a)
         RETURN a, owner,
         originalPic.id as originalPicID,
         thumbnailPic.id as thumbnailPicID,
         pic200.id as pic200ID,
         pic600.id as pic600ID`,
        { accountID }
      );
    });

    // Get additional product details if this is a product account
    let productDetails = null;
    if (account.accountType === 'PHYSICAL_ASSET') {
      const productDetailsResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AccountInternal {id: $accountID})
           OPTIONAL MATCH (a)-[:HAS_ATTRIBUTE]->(attr:Attribute)
           RETURN collect(attr) as attributes`,
          { accountID }
        );
      });

      // Format product attributes
      const attributes = productDetailsResult.records[0].get("attributes");
      productDetails = {
        attributes: attributes.map((attr: any) => ({
          name: attr.properties.name,
          value: attr.properties.value,
        })),
      };
    }

    // Get media assets related to this account
    const mediaResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})
         MATCH (a)-[r:HAS_MEDIA]->(media:Asset)
         RETURN media, type(r) as relationshipType
         ORDER BY media.createdAt DESC`,
        { accountID }
      );
    });

    // Parse location if it's a string
    let location = account.location;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        logger.warn("Failed to parse location data", {
          location,
          error: e instanceof Error ? e.message : "Unknown error"
        });
        location = null;
      }
    }

    // Format the account details
    const accountDetails = {
      accountID: account.id,
      accountName: account.accountName,
      accountHandle: account.accountHandle || "",
      accountDescription: account.accountDescription || "",
      accountType: account.accountType,
      storeOpen: account.storeOpen || false,
      location: location,
      owner: accountDetailsResult.records[0].get("owner") ? {
        memberID: accountDetailsResult.records[0].get("owner").properties.memberID,
        firstname: accountDetailsResult.records[0].get("owner").properties.firstname,
        lastname: accountDetailsResult.records[0].get("owner").properties.lastname,
        memberHandle: accountDetailsResult.records[0].get("owner").properties.memberHandle,
        vendorBio: accountDetailsResult.records[0].get("owner").properties.vendorBio
      } : null,
      profilePictures: {
        original: accountDetailsResult.records[0].get("originalPicID") || null,
        thumbnail: accountDetailsResult.records[0].get("thumbnailPicID") || null,
        pic200: accountDetailsResult.records[0].get("pic200ID") || null,
        pic600: accountDetailsResult.records[0].get("pic600ID") || null,
      }
    };

    // Format the media assets
    const media = mediaResult.records.map((record: any) => {
      const mediaAsset = record.get("media").properties;
      const relationshipType = record.get("relationshipType");
      
      return {
        assetID: mediaAsset.id,
        assetType: mediaAsset.assetType || "IMAGE",
        relationshipType,
        url: mediaAsset.url || null,
        createdAt: mediaAsset.createdAt,
      };
    });

    res.status(200).json({
      message: "Account internal data retrieved successfully",
      data: {
        action: {
          id: accountID,
          type: "ACCOUNT_INTERNAL_DATA_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            accountName: account.accountName,
          },
        },
        dashboard: {
          account: accountDetails,
          productDetails,
          media,
          isOwner,
        },
      },
    });
  } catch (error) {
    logger.error("Error in GetAccountInternalDataController", {
      controller: "GetAccountInternalDataController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
