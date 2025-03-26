import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for retrieving product information
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetProductController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("GetProductController called", {
      controller: "GetProductController",
      params: req.params,
    });

    const { productID } = req.params;
    const memberID = req.user?.memberID;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the product exists
    const productCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (p:AccountInternal {id: $productID, accountType: 'PHYSICAL_ASSET'})
         RETURN p`,
        { productID }
      );
    });

    if (productCheckResult.records.length === 0) {
      throw new Error("Product not found");
    }

    // Get product details, store information, and vendor information
    const productDetailsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (p:AccountInternal {id: $productID, accountType: 'PHYSICAL_ASSET'})
         MATCH (owner:Member)-[:OWNS]->(p)
         OPTIONAL MATCH (owner)-[:OWNS]->(store:AccountInternal)
         WHERE store.storeOpen = true
         OPTIONAL MATCH (p)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:Asset)
         OPTIONAL MATCH (p)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:Asset)
         OPTIONAL MATCH (p)-[:PROFILE_PIC_200_JPG]->(pic200:Asset)
         OPTIONAL MATCH (p)-[:PROFILE_PIC_600_JPG]->(pic600:Asset)
         OPTIONAL MATCH (owner)-[:PROFILE_PIC_THUMBNAIL_JPG]->(ownerThumbPic:Asset)
         RETURN p, owner, store,
         originalPic.id as originalPicID,
         thumbnailPic.id as thumbnailPicID,
         pic200.id as pic200ID,
         pic600.id as pic600ID,
         ownerThumbPic.id as ownerThumbPicID`,
        { productID }
      );
    });

    if (productDetailsResult.records.length === 0) {
      throw new Error("Failed to retrieve product details");
    }

    const product = productDetailsResult.records[0].get("p").properties;
    const owner = productDetailsResult.records[0].get("owner").properties;
    const store = productDetailsResult.records[0].get("store")?.properties;

    // Get additional product attributes
    const productAttributesResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (p:AccountInternal {id: $productID})
         OPTIONAL MATCH (p)-[:HAS_ATTRIBUTE]->(attr:Attribute)
         RETURN collect(attr) as attributes`,
        { productID }
      );
    });

    // Format product attributes
    const attributes = productAttributesResult.records[0].get("attributes");
    const formattedAttributes = attributes.map((attr: any) => ({
      name: attr.properties.name,
      value: attr.properties.value,
    }));

    // Parse store location if it's a string
    let storeLocation = store?.location;
    if (typeof storeLocation === 'string') {
      try {
        storeLocation = JSON.parse(storeLocation);
      } catch (e) {
        logger.warn("Failed to parse location data", {
          location: storeLocation,
          error: e instanceof Error ? e.message : "Unknown error"
        });
        storeLocation = null;
      }
    }

    // Format the product details
    const productDetails = {
      productID: product.id,
      productName: product.accountName,
      productHandle: product.accountHandle || "",
      productDescription: product.accountDescription || "",
      profilePictures: {
        original: productDetailsResult.records[0].get("originalPicID") || null,
        thumbnail: productDetailsResult.records[0].get("thumbnailPicID") || null,
        pic200: productDetailsResult.records[0].get("pic200ID") || null,
        pic600: productDetailsResult.records[0].get("pic600ID") || null,
      },
      attributes: formattedAttributes,
    };

    // Format the store information
    const storeInfo = store ? {
      storeID: store.id,
      storeName: store.accountName,
      storeHandle: store.accountHandle || "",
      storeDescription: store.accountDescription || "",
      storeOpen: store.storeOpen || false,
      location: storeLocation,
    } : null;

    // Format the vendor information
    const vendorInfo = {
      memberID: owner.memberID,
      firstname: owner.firstname,
      lastname: owner.lastname,
      memberHandle: owner.memberHandle || "",
      vendorBio: owner.vendorBio || "",
      profilePicture: productDetailsResult.records[0].get("ownerThumbPicID") || null,
    };

    res.status(200).json({
      message: "Product information retrieved successfully",
      data: {
        action: {
          id: productID,
          type: "PRODUCT_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            productID,
            productName: product.accountName,
          },
        },
        dashboard: {
          product: productDetails,
          store: storeInfo,
          vendor: vendorInfo,
        },
      },
    });
  } catch (error) {
    logger.error("Error in GetProductController", {
      controller: "GetProductController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
