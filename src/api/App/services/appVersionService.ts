import logger from "../../../utils/logger";
import { handleServiceError, createErrorDetails } from "../../../utils/errorUtils";
import { appVersionRepository } from "../repositories/appVersionRepository";
import { AppVersion, AppVersionResponse } from "../models/appVersion";
import NodeCache from "node-cache";

interface DeviceInfo {
  android_version?: string;
  ios_version?: string;
  device_model?: string;
  screen_size?: string;
}

interface UserInfo {
  user_id?: string;
}

interface VersionCheckRequest {
  app_id: string;
  current_version: string;
  device_info?: DeviceInfo;
  user_info?: UserInfo;
}

// Cache for app versions (TTL: 5 minutes)
const appVersionCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * AppVersionService
 * 
 * Checks if an update is available for the app based on the current version.
 * Returns update information if an update is available.
 * 
 * @param request - Version check request containing app_id, current_version, device_info, and user_info
 * @returns AppVersionResponse containing update availability and details
 */
export async function AppVersionService(request: VersionCheckRequest): Promise<AppVersionResponse> {
  logger.debug("Entering AppVersionService", { 
    app_id: request.app_id,
    current_version: request.current_version
  });

  try {
    // Determine platform (Android or iOS)
    const platform = request.device_info?.android_version ? 'android' : 'ios';
    
    // Check cache first
    const cacheKey = `${request.app_id}:${platform}`;
    const cachedVersion = appVersionCache.get<AppVersion>(cacheKey);
    
    // Get latest app version from repository or cache
    let latestVersion: AppVersion | null;
    if (cachedVersion) {
      logger.debug("Using cached app version", { 
        app_id: request.app_id, 
        platform,
        cached: true
      });
      latestVersion = cachedVersion;
    } else {
      logger.debug("Fetching app version from database", { 
        app_id: request.app_id, 
        platform
      });
      latestVersion = await appVersionRepository.getLatestAppVersion(request.app_id, platform);
      
      // Cache the result if found
      if (latestVersion) {
        appVersionCache.set(cacheKey, latestVersion);
      }
    }
    
    // If no version found, return no update available
    if (!latestVersion) {
      logger.info("No app version found", { 
        app_id: request.app_id,
        platform
      });
      return { update_available: false };
    }
    
    // Compare versions
    if (compareVersions(request.current_version, latestVersion.version) < 0) {
      // Update is available
      const updateRequired = compareVersions(request.current_version, latestVersion.minRequiredVersion) < 0;
      
      logger.info("Update available", {
        app_id: request.app_id,
        current_version: request.current_version,
        latest_version: latestVersion.version,
        update_required: updateRequired
      });
      
      return {
        update_available: true,
        latest_version: latestVersion.version,
        update_required: updateRequired,
        update_priority: latestVersion.updatePriority,
        update_type: latestVersion.updateType,
        update_url: latestVersion.updateUrl,
        file_size_bytes: latestVersion.fileSizeBytes,
        release_notes: latestVersion.releaseNotes,
        release_date: latestVersion.releaseDate
      };
    }

    // No update available
    logger.info("No update available", {
      app_id: request.app_id,
      current_version: request.current_version,
      latest_version: latestVersion.version
    });
    
    return { update_available: false };
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error(
      "Error in AppVersionService",
      createErrorDetails(handledError, { 
        app_id: request.app_id,
        current_version: request.current_version
      })
    );
    throw handledError;
  } finally {
    logger.debug("Exiting AppVersionService", {
      app_id: request.app_id,
      current_version: request.current_version
    });
  }
}

/**
 * Compare two version strings.
 * 
 * @param version1 - First version string (e.g., "1.0.0")
 * @param version2 - Second version string (e.g., "1.1.0")
 * @returns -1 if version1 < version2, 0 if version1 === version2, 1 if version1 > version2
 */
function compareVersions(version1: string, version2: string): number {
  // Handle version strings with build numbers (e.g., "1.0.0+33")
  const [semVer1, build1] = version1.split('+');
  const [semVer2, build2] = version2.split('+');
  
  // Compare semantic versions
  const parts1 = semVer1.split('.').map(Number);
  const parts2 = semVer2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  // If semantic versions are equal, compare build numbers
  if (build1 && build2) {
    const buildNum1 = parseInt(build1, 10);
    const buildNum2 = parseInt(build2, 10);
    
    if (buildNum1 < buildNum2) return -1;
    if (buildNum1 > buildNum2) return 1;
  } else if (build1) {
    return 1; // version with build number is newer
  } else if (build2) {
    return -1; // version without build number is older
  }
  
  return 0; // versions are equal
}
