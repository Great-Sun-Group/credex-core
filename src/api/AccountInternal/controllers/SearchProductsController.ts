import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getMultipleAssetUrls } from "../../../services/assetUrlService";

/**
 * Controller for searching products in the Vimbiso Market
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function SearchProductsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("SearchProductsController called", {
      controller: "SearchProductsController",
      query: req.query,
    });

    const { keyword, latitude, longitude, radius = 10 } = req.query;
    const memberID = req.user?.memberID;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Convert parameters to appropriate types
    const searchKeyword = String(keyword).toLowerCase();
    const lat = parseFloat(String(latitude));
    const lng = parseFloat(String(longitude));
    const searchRadius = parseFloat(String(radius));

    // Validate parameters
    if (isNaN(lat) || isNaN(lng) || isNaN(searchRadius)) {
      throw new Error("Invalid location parameters");
    }

    // Search for products matching the keyword and within the specified radius
    const result = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal)
         WHERE a.accountType = 'PHYSICAL_ASSET' 
         AND toLower(a.accountName) CONTAINS $keyword
         WITH a
         MATCH (m:Member)-[:OWNS]->(a)
         OPTIONAL MATCH (m)-[:OWNS]->(storeAccount:AccountInternal)
         WHERE storeAccount.storeOpen = true
         WITH a, m, storeAccount
         WHERE storeAccount IS NOT NULL
         AND point.distance(
           point({latitude: storeAccount.location.latitude, longitude: storeAccount.location.longitude}),
           point({latitude: $latitude, longitude: $longitude})
         ) <= $radius * 1000 // Convert km to meters
         OPTIONAL MATCH (a)-[:PROFILE_PIC_THUMBNAIL_JPG]->(productThumb:Asset)
         OPTIONAL MATCH (storeAccount)-[:PROFILE_PIC_THUMBNAIL_JPG]->(storeThumb:Asset)
         OPTIONAL MATCH (m)-[:PROFILE_PIC_THUMBNAIL_JPG]->(memberThumb:Asset)
         RETURN a, m, storeAccount,
         point.distance(
           point({latitude: storeAccount.location.latitude, longitude: storeAccount.location.longitude}),
           point({latitude: $latitude, longitude: $longitude})
         ) / 1000 as distance, // Convert meters to km
         productThumb.id as productThumbID,
         storeThumb.id as storeThumbID,
         memberThumb.id as memberThumbID
         ORDER BY distance ASC`,
        { 
          keyword: searchKeyword, 
          latitude: lat, 
          longitude: lng, 
          radius: searchRadius 
        }
      );
    });

    // Get all asset IDs that need URLs
    const assetIDs = result.records
      .flatMap((record: any) => [
        record.get('productThumbID'),
        record.get('storeThumbID'),
        record.get('memberThumbID')
      ])
      .filter(Boolean);

    // Get URLs for all assets in a single batch operation
    const assetUrls = await getMultipleAssetUrls(assetIDs);

    // Transform the results into a more usable format
    const products = result.records.map((record: any) => {
      const product = record.get('a').properties;
      const member = record.get('m').properties;
      const store = record.get('storeAccount').properties;
      const distance = record.get('distance');
      const productThumbID = record.get('productThumbID');
      const storeThumbID = record.get('storeThumbID');
      const memberThumbID = record.get('memberThumbID');

      // Parse location if it's a string
      let location = store.location;
      if (typeof location === 'string') {
        try {
          location = JSON.parse(location);
        } catch (e) {
          logger.warn("Failed to parse location data", {
            location,
            error: e instanceof Error ? e.message : "Unknown error"
          });
        }
      }

      return {
        productID: product.id,
        productName: product.accountName,
        productDescription: product.accountDescription || "",
        productHandle: product.accountHandle || "",
        thumbnailPicUrl: productThumbID ? assetUrls[productThumbID] : null,
        store: {
          storeID: store.id,
          storeName: store.accountName,
          storeHandle: store.accountHandle || "",
          storeDescription: store.accountDescription || "",
          location: location,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          thumbnailPicUrl: storeThumbID ? assetUrls[storeThumbID] : null
        },
        vendor: {
          memberID: member.memberID,
          firstname: member.firstname,
          lastname: member.lastname,
          memberHandle: member.memberHandle || "",
          vendorBio: member.vendorBio || "",
          thumbnailPicUrl: memberThumbID ? assetUrls[memberThumbID] : null
        }
      };
    });

    res.status(200).json({
      message: "Products found",
      data: {
        action: {
          id: null,
          type: "PRODUCTS_SEARCHED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            keyword: searchKeyword,
            latitude: lat,
            longitude: lng,
            radius: searchRadius,
            resultsCount: products.length
          },
        },
        dashboard: {
          products: products,
          searchParams: {
            keyword: searchKeyword,
            latitude: lat,
            longitude: lng,
            radius: searchRadius
          }
        },
      },
    });
  } catch (error) {
    logger.error("Error in SearchProductsController", {
      controller: "SearchProductsController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
