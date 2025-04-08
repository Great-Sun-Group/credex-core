import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { getMultipleAssetUrls } from "../../../services/assetUrlService";

interface StorefrontDetails {
  store: {
    accountID: string;
    accountName: string;
    accountHandle: string;
    accountDescription: string;
    storeOpen: boolean;
    location: any;
    profilePictureUrls: {
      original: string | null;
      thumbnail: string | null;
      pic200: string | null;
      pic600: string | null;
    };
  };
  products: Array<{
    productID: string;
    productName: string;
    productHandle: string;
    productDescription: string;
    thumbnailPicUrl: string | null;
  }>;
  vendor: {
    memberID: string;
    firstname: string;
    lastname: string;
    memberHandle: string;
    vendorBio: string;
    profilePictureUrl: string | null;
  };
}

interface GetStorefrontResult {
  success: boolean;
  data?: StorefrontDetails;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * GetStorefrontService
 *
 * Retrieves storefront information for an account, including products and vendor details.
 *
 * @param accountID - The ID of the account to retrieve storefront information for
 * @returns GetStorefrontResult containing storefront details if found
 */
export async function GetStorefrontService(
  accountID: string
): Promise<GetStorefrontResult> {
  logger.debug("GetStorefrontService called", { accountID });

  const session = ledgerSpaceDriver.session();

  try {
    logger.debug("Starting GetStorefrontService", { accountID });

    // Check if the account exists
    logger.debug("Checking if account exists", { accountID });
    const accountCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:Account {accountID: $accountID})
         RETURN a`,
        { accountID }
      );
    });

    if (accountCheckResult.records.length === 0) {
      logger.warn("Account not found", { accountID });
      return {
        success: false,
        message: `No account found with ID: ${accountID}`,
        error: {
          code: "ACCOUNT_NOT_FOUND",
          details: "The specified account does not exist",
        },
      };
    }

    logger.debug("Account found, getting account details", { accountID });

    // Get account details, account pictures, and owner information
    const accountDetailsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:Account {accountID: $accountID})
         MATCH (owner:Member)-[:OWNS]->(a)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:AssetMarker)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_200_JPG]->(pic200:AssetMarker)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_600_JPG]->(pic600:AssetMarker)
         OPTIONAL MATCH (owner)-[:PROFILE_PIC_THUMBNAIL_JPG]->(ownerThumbPic:AssetMarker)
         RETURN a, owner,
         originalPic.id as originalPicID,
         thumbnailPic.id as thumbnailPicID,
         pic200.id as pic200ID,
         pic600.id as pic600ID,
         ownerThumbPic.id as ownerThumbPicID`,
        { accountID }
      );
    });

    if (accountDetailsResult.records.length === 0) {
      logger.warn("Failed to retrieve account details", { accountID });
      return {
        success: false,
        message: "Failed to retrieve account details",
        error: {
          code: "ACCOUNT_DETAILS_NOT_FOUND",
          details: "Could not retrieve account details",
        },
      };
    }

    logger.debug("Account details retrieved, getting products", { accountID });

    // Get products (AccountInternal nodes with accountType = 'PHYSICAL_ASSET') available in this store
    const accountProductsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:Account {accountID: $accountID})
         OPTIONAL MATCH (p:AccountInternal)-[:AVAILABLE_IN]->(a)
         WHERE p.accountType = 'PHYSICAL_ASSET'
         OPTIONAL MATCH (p)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
         RETURN p, thumbnailPic.id as thumbnailPicID
         ORDER BY p.accountName`,
        { accountID }
      );
    });

    logger.debug("Products retrieved, processing data", {
      accountID,
      productsCount: accountProductsResult.records.length,
    });

    const account = accountDetailsResult.records[0].get("a").properties;
    const owner = accountDetailsResult.records[0].get("owner").properties;

    // Get all asset IDs that need URLs
    const assetIDs = [
      accountDetailsResult.records[0].get("originalPicID"),
      accountDetailsResult.records[0].get("thumbnailPicID"),
      accountDetailsResult.records[0].get("pic200ID"),
      accountDetailsResult.records[0].get("pic600ID"),
      accountDetailsResult.records[0].get("ownerThumbPicID"),
      ...accountProductsResult.records
        .filter((record: any) => record.get("thumbnailPicID") !== null)
        .map((record: any) => record.get("thumbnailPicID")),
    ].filter(Boolean);

    logger.debug("Getting asset URLs", {
      accountID,
      assetCount: assetIDs.length,
    });

    // Get URLs for all assets in a single batch operation
    const assetUrls = await getMultipleAssetUrls(assetIDs);

    logger.debug("Asset URLs retrieved, formatting response", { accountID });

    // Parse account location if it's a string
    let accountLocation = account.location;
    if (typeof accountLocation === "string") {
      try {
        accountLocation = JSON.parse(accountLocation);
      } catch (e) {
        logger.warn("Failed to parse location data", {
          location: accountLocation,
          error: e instanceof Error ? e.message : "Unknown error",
        });
        accountLocation = null;
      }
    }

    // Format the store details (Account node)
    const storeDetails = {
      accountID: account.accountID,
      accountName: account.accountName,
      accountHandle: account.accountHandle || "",
      accountDescription: account.accountDescription || "",
      storeOpen: account.storeOpen || false,
      location: accountLocation,
      profilePictureUrls: {
        original: accountDetailsResult.records[0].get("originalPicID")
          ? assetUrls[accountDetailsResult.records[0].get("originalPicID")]
          : null,
        thumbnail: accountDetailsResult.records[0].get("thumbnailPicID")
          ? assetUrls[accountDetailsResult.records[0].get("thumbnailPicID")]
          : null,
        pic200: accountDetailsResult.records[0].get("pic200ID")
          ? assetUrls[accountDetailsResult.records[0].get("pic200ID")]
          : null,
        pic600: accountDetailsResult.records[0].get("pic600ID")
          ? assetUrls[accountDetailsResult.records[0].get("pic600ID")]
          : null,
      },
    };

    // Format the products (AccountInternal nodes)
    const products = accountProductsResult.records
      .filter((record: any) => record.get("p") !== null)
      .map((record: any) => {
        const product = record.get("p").properties;
        const thumbnailPicID = record.get("thumbnailPicID");
        return {
          productID: product.id, // AccountInternal uses 'id' property
          productName: product.accountName,
          productHandle: product.accountHandle || "",
          productDescription: product.accountDescription || "",
          thumbnailPicUrl: thumbnailPicID ? assetUrls[thumbnailPicID] : null,
        };
      });

    // Format the vendor information (Member node)
    const ownerThumbPicID =
      accountDetailsResult.records[0].get("ownerThumbPicID");
    const vendorInfo = {
      memberID: owner.memberID,
      firstname: owner.firstname,
      lastname: owner.lastname,
      memberHandle: owner.memberHandle || "",
      vendorBio: owner.vendorBio || "",
      profilePictureUrl: ownerThumbPicID ? assetUrls[ownerThumbPicID] : null,
    };

    logger.info("Storefront information retrieved successfully", {
      accountID,
      productsCount: products.length,
    });

    return {
      success: true,
      data: {
        store: storeDetails,
        products,
        vendor: vendorInfo,
      },
      message: "Storefront information retrieved successfully",
    };
  } catch (error) {
    logger.error("Error fetching storefront data", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
    });

    return {
      success: false,
      message: "Failed to retrieve storefront information",
      error: {
        code: "DATABASE_ERROR",
        details:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  } finally {
    logger.debug("Closing database session", { accountID });
    await session.close();
  }
}
