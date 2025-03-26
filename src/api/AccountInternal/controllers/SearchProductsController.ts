import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

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
         RETURN a, m, storeAccount,
         point.distance(
           point({latitude: storeAccount.location.latitude, longitude: storeAccount.location.longitude}),
           point({latitude: $latitude, longitude: $longitude})
         ) / 1000 as distance // Convert meters to km
         ORDER BY distance ASC`,
        { 
          keyword: searchKeyword, 
          latitude: lat, 
          longitude: lng, 
          radius: searchRadius 
        }
      );
    });

    // Transform the results into a more usable format
    const products = result.records.map((record: any) => {
      const product = record.get('a').properties;
      const member = record.get('m').properties;
      const store = record.get('storeAccount').properties;
      const distance = record.get('distance');

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
        store: {
          storeID: store.id,
          storeName: store.accountName,
          storeHandle: store.accountHandle || "",
          storeDescription: store.accountDescription || "",
          location: location,
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
        },
        vendor: {
          memberID: member.memberID,
          firstname: member.firstname,
          lastname: member.lastname,
          memberHandle: member.memberHandle || "",
          vendorBio: member.vendorBio || ""
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
