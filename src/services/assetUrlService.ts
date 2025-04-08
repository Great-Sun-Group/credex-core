import { getSignedS3Url } from './s3Service';
import { ledgerSpaceDriver } from '../../config/neo4j';
import logger from '../utils/logger';

// Simple in-memory cache implementation
interface CacheEntry {
  value: string;
  expiry: number;
}

// Cache object to store URLs
const urlCache: Record<string, CacheEntry> = {};

// Clean up expired entries every 24 hours
setInterval(() => {
  const now = Date.now();
  Object.keys(urlCache).forEach(key => {
    if (urlCache[key].expiry < now) {
      delete urlCache[key];
    }
  });
}, 24 * 60 * 60 * 1000);

/**
 * Get a signed URL for an asset
 * @param assetID The AssetMarker ID
 * @returns Promise resolving to the signed URL or null if not found
 */
export async function getAssetUrl(assetID: string): Promise<string | null> {
  if (!assetID) return null;
  
  const cacheKey = `asset_url_${assetID}`;
  
  // Check cache first
  if (urlCache[cacheKey] && urlCache[cacheKey].expiry > Date.now()) {
    const cachedUrl = urlCache[cacheKey].value;
    return cachedUrl;
  }
  
  try {
    // Get the s3Key for this asset
    const s3Key = await getS3KeyForAsset(assetID);
    if (!s3Key) return null;
    
    // Generate a new URL
    const url = await getSignedS3Url(s3Key);
    
    // Cache the URL (expires in 7 days)
    urlCache[cacheKey] = {
      value: url,
      expiry: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };
    
    return url;
  } catch (error) {
    logger.error("Error getting asset URL", {
      error: error instanceof Error ? error.message : "Unknown error",
      assetID
    });
    return null;
  }
}

/**
 * Get multiple asset URLs in a single batch operation
 * @param assetIDs Array of AssetMarker IDs
 * @returns Promise resolving to a map of assetID to URL
 */
export async function getMultipleAssetUrls(assetIDs: string[]): Promise<Record<string, string>> {
  // Filter out null/undefined values
  const validAssetIDs = assetIDs.filter(id => id);
  
  // Create result object
  const result: Record<string, string> = {};
  
  // Process in parallel
  await Promise.all(
    validAssetIDs.map(async (assetID) => {
      try {
        const url = await getAssetUrl(assetID);
        if (url) result[assetID] = url;
      } catch (error) {
        logger.error(`Error getting URL for asset ${assetID}:`, error);
        // Don't add failed URLs to result
      }
    })
  );
  
  return result;
}

/**
 * Get all profile picture URLs for an entity (member, account, product)
 * @param entityID The ID of the entity (memberID, accountID, etc.)
 * @param entityType The type of entity ('Member', 'AccountInternal', etc.)
 * @returns Promise resolving to an object with URLs for different image sizes
 */
export async function getProfilePictureUrls(entityID: string, entityType: string): Promise<{
  original?: string;
  thumbnail?: string;
  pic200?: string;
  pic600?: string;
} | null> {
  if (!entityID || !entityType) return null;
  
  const session = ledgerSpaceDriver.session();
  try {
    // Get all profile picture asset IDs
    const result = await session.executeRead(async (tx: any) => {
      let query: string;
      let params: any = {};
      
      if (entityType === 'Member') {
        query = `
          MATCH (m:Member {memberID: $entityID})
          OPTIONAL MATCH (m)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:AssetMarker)
          OPTIONAL MATCH (m)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
          OPTIONAL MATCH (m)-[:PROFILE_PIC_200_JPG]->(pic200:AssetMarker)
          OPTIONAL MATCH (m)-[:PROFILE_PIC_600_JPG]->(pic600:AssetMarker)
          RETURN 
            originalPic.id as originalPicID,
            thumbnailPic.id as thumbnailPicID,
            pic200.id as pic200ID,
            pic600.id as pic600ID
        `;
        params = { entityID };
      } else {
        query = `
          MATCH (e:${entityType} {id: $entityID})
          OPTIONAL MATCH (e)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:AssetMarker)
          OPTIONAL MATCH (e)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
          OPTIONAL MATCH (e)-[:PROFILE_PIC_200_JPG]->(pic200:AssetMarker)
          OPTIONAL MATCH (e)-[:PROFILE_PIC_600_JPG]->(pic600:AssetMarker)
          RETURN 
            originalPic.id as originalPicID,
            thumbnailPic.id as thumbnailPicID,
            pic200.id as pic200ID,
            pic600.id as pic600ID
        `;
        params = { entityID };
      }
      
      return await tx.run(query, params);
    });
    
    if (result.records.length === 0) {
      return null;
    }
    
    const record = result.records[0];
    const assetIDs = [
      record.get("originalPicID"),
      record.get("thumbnailPicID"),
      record.get("pic200ID"),
      record.get("pic600ID")
    ].filter(Boolean);
    
    if (assetIDs.length === 0) {
      return null;
    }
    
    // Get URLs for all asset IDs
    const urls = await getMultipleAssetUrls(assetIDs);
    
    return {
      original: record.get("originalPicID") ? urls[record.get("originalPicID")] : undefined,
      thumbnail: record.get("thumbnailPicID") ? urls[record.get("thumbnailPicID")] : undefined,
      pic200: record.get("pic200ID") ? urls[record.get("pic200ID")] : undefined,
      pic600: record.get("pic600ID") ? urls[record.get("pic600ID")] : undefined
    };
  } catch (error) {
    logger.error("Error getting profile picture URLs", {
      error: error instanceof Error ? error.message : "Unknown error",
      entityID,
      entityType
    });
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Helper function to get S3 key for an asset
 * @param assetID The AssetMarker ID
 * @returns Promise resolving to the S3 key
 */
async function getS3KeyForAsset(assetID: string): Promise<string | null> {
  const session = ledgerSpaceDriver.session();
  try {
    const result = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AssetMarker {id: $assetID})
         RETURN a.s3Key AS s3Key`,
        { assetID }
      );
    });
    
    if (result.records.length === 0 || !result.records[0].get("s3Key")) {
      return null;
    }
    
    return result.records[0].get("s3Key");
  } catch (error) {
    logger.error("Error getting S3 key for asset", {
      error: error instanceof Error ? error.message : "Unknown error",
      assetID
    });
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Invalidate a cached URL for an asset
 * @param assetID The AssetMarker ID
 */
export function invalidateAssetUrlCache(assetID: string): void {
  const cacheKey = `asset_url_${assetID}`;
  delete urlCache[cacheKey];
}
