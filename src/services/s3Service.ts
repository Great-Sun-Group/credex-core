import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger, { logInfo, logError } from "../utils/logger";

// Initialize S3 client
const s3Client = new S3Client({
  region: "af-south-1", // Hardcoded region as per requirements
});

// Bucket name for AssetMarker data
const ASSET_MARKER_BUCKET = `credexbuckets4-assetmarker-data-${process.env.NODE_ENV || "development"}`;

/**
 * Upload data to S3
 * @param data - The data to upload (Buffer or string)
 * @param key - The S3 key to use
 * @param contentType - The content type of the data
 * @returns The S3 key of the uploaded object
 */
export async function uploadToS3(
  data: Buffer | string,
  key: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: ASSET_MARKER_BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    });

    await s3Client.send(command);
    logInfo(`Successfully uploaded object to S3: ${key}`);
    return key;
  } catch (error) {
    logError(
      "Error uploading to S3",
      error instanceof Error ? error : new Error(String(error)),
      {
        error: error instanceof Error ? error.message : String(error),
        key,
      }
    );
    throw new Error(
      `Failed to upload to S3: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get a pre-signed URL for an S3 object
 * @param key - The S3 key of the object
 * @param expiresIn - The number of seconds until the URL expires (default: 7 days)
 * @returns A pre-signed URL for the object
 */
export async function getSignedS3Url(
  key: string,
  expiresIn = 604800 // 7 days in seconds
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: ASSET_MARKER_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    logInfo(`Generated pre-signed URL for: ${key}`);
    return url;
  } catch (error) {
    logError(
      "Error generating pre-signed URL",
      error instanceof Error ? error : new Error(String(error)),
      {
        error: error instanceof Error ? error.message : String(error),
        key,
      }
    );
    throw new Error(
      `Failed to generate pre-signed URL: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete an object from S3
 * @param key - The S3 key of the object to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: ASSET_MARKER_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    logInfo(`Successfully deleted object from S3: ${key}`);
  } catch (error) {
    logError(
      "Error deleting from S3",
      error instanceof Error ? error : new Error(String(error)),
      {
        error: error instanceof Error ? error.message : String(error),
        key,
      }
    );
    throw new Error(
      `Failed to delete from S3: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate a unique S3 key for an AssetMarker
 * @param prefix - Optional prefix for the key
 * @param filename - The filename to use
 * @returns A unique S3 key
 */
export function generateS3Key(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

  return `${prefix}/${timestamp}-${randomString}-${sanitizedFilename}`;
}
