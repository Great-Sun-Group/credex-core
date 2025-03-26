import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import {
  getMultipleAssetUrls,
  getProfilePictureUrls,
} from "../../../services/assetUrlService";

/**
 * Controller for retrieving member information
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetMemberController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();

  try {
    logger.info("GetMemberController called", {
      controller: "GetMemberController",
      params: req.params,
    });

    const { memberID } = req.params;
    const requestingMemberID = req.user?.memberID;

    if (!requestingMemberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the member exists
    const memberCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})
         RETURN m`,
        { memberID }
      );
    });

    if (memberCheckResult.records.length === 0) {
      throw new Error("Member not found");
    }

    // Get member profile information and profile pictures
    const memberDetailsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})
         OPTIONAL MATCH (m)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:AssetMarker)
         OPTIONAL MATCH (m)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
         OPTIONAL MATCH (m)-[:PROFILE_PIC_200_JPG]->(pic200:AssetMarker)
         OPTIONAL MATCH (m)-[:PROFILE_PIC_600_JPG]->(pic600:AssetMarker)
         RETURN m,
         originalPic.id as originalPicID,
         thumbnailPic.id as thumbnailPicID,
         pic200.id as pic200ID,
         pic600.id as pic600ID`,
        { memberID }
      );
    });

    // Get member's stores
    const storesResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a:AccountInternal)
         WHERE a.accountType <> 'PHYSICAL_ASSET'
         OPTIONAL MATCH (a)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
         RETURN a, thumbnailPic.id as thumbnailPicID
         ORDER BY a.accountName`,
        { memberID }
      );
    });

    // Get member's products
    const productsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(p:AccountInternal)
         WHERE p.accountType = 'PHYSICAL_ASSET'
         OPTIONAL MATCH (p)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
         RETURN p, thumbnailPic.id as thumbnailPicID
         ORDER BY p.accountName`,
        { memberID }
      );
    });

    const member = memberDetailsResult.records[0].get("m").properties;

    // Get all asset IDs that need URLs
    const assetIDs = [
      memberDetailsResult.records[0].get("originalPicID"),
      memberDetailsResult.records[0].get("thumbnailPicID"),
      memberDetailsResult.records[0].get("pic200ID"),
      memberDetailsResult.records[0].get("pic600ID"),
      ...storesResult.records.map((record: any) => record.get("thumbnailPicID")),
      ...productsResult.records.map((record: any) => record.get("thumbnailPicID")),
    ].filter(Boolean);

    // Get URLs for all assets in a single batch operation
    const assetUrls = await getMultipleAssetUrls(assetIDs);

    // Format the member profile information
    const memberProfile = {
      memberID: member.memberID,
      firstname: member.firstname,
      lastname: member.lastname,
      memberHandle: member.memberHandle || "",
      vendorBio: member.vendorBio || "",
      vendor: member.vendor || false,
      profilePictureUrls: {
        original: memberDetailsResult.records[0].get("originalPicID")
          ? assetUrls[memberDetailsResult.records[0].get("originalPicID")]
          : null,
        thumbnail: memberDetailsResult.records[0].get("thumbnailPicID")
          ? assetUrls[memberDetailsResult.records[0].get("thumbnailPicID")]
          : null,
        pic200: memberDetailsResult.records[0].get("pic200ID")
          ? assetUrls[memberDetailsResult.records[0].get("pic200ID")]
          : null,
        pic600: memberDetailsResult.records[0].get("pic600ID")
          ? assetUrls[memberDetailsResult.records[0].get("pic600ID")]
          : null,
      },
    };

    // Format the stores
    const stores = storesResult.records.map((record: any) => {
      const store = record.get("a").properties;
      const thumbnailPicID = record.get("thumbnailPicID");

      // Parse store location if it's a string
      let location = store.location;
      if (typeof location === "string") {
        try {
          location = JSON.parse(location);
        } catch (e) {
          logger.warn("Failed to parse location data", {
            location,
            error: e instanceof Error ? e.message : "Unknown error",
          });
          location = null;
        }
      }

      return {
        storeID: store.id,
        storeName: store.accountName,
        storeHandle: store.accountHandle || "",
        storeDescription: store.accountDescription || "",
        storeOpen: store.storeOpen || false,
        location: location,
        thumbnailPicUrl: thumbnailPicID ? assetUrls[thumbnailPicID] : null,
      };
    });

    // Format the products
    const products = productsResult.records.map((record: any) => {
      const product = record.get("p").properties;
      const thumbnailPicID = record.get("thumbnailPicID");
      return {
        productID: product.id,
        productName: product.accountName,
        productHandle: product.accountHandle || "",
        productDescription: product.accountDescription || "",
        thumbnailPicUrl: thumbnailPicID ? assetUrls[thumbnailPicID] : null,
      };
    });

    res.status(200).json({
      message: "Member information retrieved successfully",
      data: {
        action: {
          id: memberID,
          type: "MEMBER_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: requestingMemberID,
          details: {
            memberID,
            memberName: `${member.firstname} ${member.lastname}`,
          },
        },
        dashboard: {
          member: memberProfile,
          stores,
          products,
        },
      },
    });
  } catch (error) {
    logger.error("Error in GetMemberController", {
      controller: "GetMemberController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
