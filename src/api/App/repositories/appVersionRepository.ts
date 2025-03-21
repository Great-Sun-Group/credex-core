import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { randomUUID } from "crypto";
import logger from "../../../utils/logger";
import { AppVersion, AppVersionCreateInput, AppVersionUpdateInput } from "../models/appVersion";

/**
 * AppVersionRepository
 * 
 * Handles database operations for app versions.
 */
export class AppVersionRepository {
  /**
   * Create a new app version
   * 
   * @param input - App version data
   * @returns The created app version
   */
  async createAppVersion(input: AppVersionCreateInput): Promise<AppVersion> {
    const session = ledgerSpaceDriver.session();
    logger.debug("Creating app version", { appId: input.appId, version: input.version });

    try {
      const now = new Date().toISOString();
      const id = randomUUID();
      const active = input.active !== undefined ? input.active : true;

      const result = await session.executeWrite(async (tx) => {
        // First, if this is set as active, deactivate all other versions for this app and platform
        if (active) {
          await tx.run(
            `
            MATCH (v:AppVersion {appId: $appId, platform: $platform, active: true})
            SET v.active = false, v.updatedAt = $now
            `,
            { appId: input.appId, platform: input.platform, now }
          );
        }

        // Create the new app version
        const result = await tx.run(
          `
          CREATE (v:AppVersion {
            id: $id,
            appId: $appId,
            platform: $platform,
            version: $version,
            minRequiredVersion: $minRequiredVersion,
            updateUrl: $updateUrl,
            fileSizeBytes: $fileSizeBytes,
            releaseNotes: $releaseNotes,
            releaseDate: $releaseDate,
            updatePriority: $updatePriority,
            updateType: $updateType,
            active: $active,
            createdAt: $now,
            updatedAt: $now
          })
          RETURN v
          `,
          {
            id,
            appId: input.appId,
            platform: input.platform,
            version: input.version,
            minRequiredVersion: input.minRequiredVersion,
            updateUrl: input.updateUrl,
            fileSizeBytes: input.fileSizeBytes,
            releaseNotes: input.releaseNotes,
            releaseDate: input.releaseDate,
            updatePriority: input.updatePriority,
            updateType: input.updateType,
            active,
            now
          }
        );

        return result.records[0].get('v').properties;
      });

      logger.info("App version created successfully", { id, appId: input.appId, version: input.version });
      
      return {
        id: result.id,
        appId: result.appId,
        platform: result.platform,
        version: result.version,
        minRequiredVersion: result.minRequiredVersion,
        updateUrl: result.updateUrl,
        fileSizeBytes: typeof result.fileSizeBytes?.toNumber === 'function' 
          ? result.fileSizeBytes.toNumber() 
          : result.fileSizeBytes,
        releaseNotes: result.releaseNotes,
        releaseDate: result.releaseDate,
        updatePriority: result.updatePriority,
        updateType: result.updateType,
        active: result.active,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (error) {
      logger.error("Error creating app version", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        appId: input.appId,
        version: input.version
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get an app version by ID
   * 
   * @param id - App version ID
   * @returns The app version or null if not found
   */
  async getAppVersionById(id: string): Promise<AppVersion | null> {
    const session = ledgerSpaceDriver.session();
    logger.debug("Getting app version by ID", { id });

    try {
      const result = await session.executeRead(async (tx) => {
        const result = await tx.run(
          `
          MATCH (v:AppVersion {id: $id})
          RETURN v
          `,
          { id }
        );

        if (result.records.length === 0) {
          return null;
        }

        return result.records[0].get('v').properties;
      });

      if (!result) {
        logger.info("App version not found", { id });
        return null;
      }

      logger.debug("App version found", { id });
      
      return {
        id: result.id,
        appId: result.appId,
        platform: result.platform,
        version: result.version,
        minRequiredVersion: result.minRequiredVersion,
        updateUrl: result.updateUrl,
        fileSizeBytes: typeof result.fileSizeBytes?.toNumber === 'function' 
          ? result.fileSizeBytes.toNumber() 
          : result.fileSizeBytes,
        releaseNotes: result.releaseNotes,
        releaseDate: result.releaseDate,
        updatePriority: result.updatePriority,
        updateType: result.updateType,
        active: result.active,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (error) {
      logger.error("Error getting app version by ID", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        id
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get the latest active app version for an app and platform
   * 
   * @param appId - App ID
   * @param platform - Platform (android or ios)
   * @returns The latest active app version or null if not found
   */
  async getLatestAppVersion(appId: string, platform: string): Promise<AppVersion | null> {
    const session = ledgerSpaceDriver.session();
    logger.debug("Getting latest app version", { appId, platform });

    try {
      const result = await session.executeRead(async (tx) => {
        const result = await tx.run(
          `
          MATCH (v:AppVersion {appId: $appId, platform: $platform, active: true})
          RETURN v
          ORDER BY v.createdAt DESC
          LIMIT 1
          `,
          { appId, platform }
        );

        if (result.records.length === 0) {
          return null;
        }

        return result.records[0].get('v').properties;
      });

      if (!result) {
        logger.info("No active app version found", { appId, platform });
        return null;
      }

      logger.debug("Latest app version found", { appId, platform, version: result.version });
      
      return {
        id: result.id,
        appId: result.appId,
        platform: result.platform,
        version: result.version,
        minRequiredVersion: result.minRequiredVersion,
        updateUrl: result.updateUrl,
        fileSizeBytes: typeof result.fileSizeBytes?.toNumber === 'function' 
          ? result.fileSizeBytes.toNumber() 
          : result.fileSizeBytes,
        releaseNotes: result.releaseNotes,
        releaseDate: result.releaseDate,
        updatePriority: result.updatePriority,
        updateType: result.updateType,
        active: result.active,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (error) {
      logger.error("Error getting latest app version", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        appId,
        platform
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get all app versions for an app
   * 
   * @param appId - App ID
   * @returns Array of app versions
   */
  async getAppVersions(appId: string): Promise<AppVersion[]> {
    const session = ledgerSpaceDriver.session();
    logger.debug("Getting app versions", { appId });

    try {
      const result = await session.executeRead(async (tx) => {
        const result = await tx.run(
          `
          MATCH (v:AppVersion {appId: $appId})
          RETURN v
          ORDER BY v.platform, v.createdAt DESC
          `,
          { appId }
        );

        return result.records.map(record => record.get('v').properties);
      });

      logger.debug("App versions found", { appId, count: result.length });
      
      return result.map(record => ({
        id: record.id,
        appId: record.appId,
        platform: record.platform,
        version: record.version,
        minRequiredVersion: record.minRequiredVersion,
        updateUrl: record.updateUrl,
        fileSizeBytes: typeof record.fileSizeBytes?.toNumber === 'function' 
          ? record.fileSizeBytes.toNumber() 
          : record.fileSizeBytes,
        releaseNotes: record.releaseNotes,
        releaseDate: record.releaseDate,
        updatePriority: record.updatePriority,
        updateType: record.updateType,
        active: record.active,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));
    } catch (error) {
      logger.error("Error getting app versions", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        appId
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Update an app version
   * 
   * @param id - App version ID
   * @param input - App version update data
   * @returns The updated app version
   */
  async updateAppVersion(id: string, input: AppVersionUpdateInput): Promise<AppVersion | null> {
    const session = ledgerSpaceDriver.session();
    logger.debug("Updating app version", { id, ...input });

    try {
      const now = new Date().toISOString();

      // Build the SET clause dynamically based on the input
      const setParams: Record<string, any> = { id, now };
      let setClauses = ['v.updatedAt = $now'];

      if (input.version !== undefined) {
        setClauses.push('v.version = $version');
        setParams.version = input.version;
      }

      if (input.minRequiredVersion !== undefined) {
        setClauses.push('v.minRequiredVersion = $minRequiredVersion');
        setParams.minRequiredVersion = input.minRequiredVersion;
      }

      if (input.updateUrl !== undefined) {
        setClauses.push('v.updateUrl = $updateUrl');
        setParams.updateUrl = input.updateUrl;
      }

      if (input.fileSizeBytes !== undefined) {
        setClauses.push('v.fileSizeBytes = $fileSizeBytes');
        setParams.fileSizeBytes = input.fileSizeBytes;
      }

      if (input.releaseNotes !== undefined) {
        setClauses.push('v.releaseNotes = $releaseNotes');
        setParams.releaseNotes = input.releaseNotes;
      }

      if (input.releaseDate !== undefined) {
        setClauses.push('v.releaseDate = $releaseDate');
        setParams.releaseDate = input.releaseDate;
      }

      if (input.updatePriority !== undefined) {
        setClauses.push('v.updatePriority = $updatePriority');
        setParams.updatePriority = input.updatePriority;
      }

      if (input.updateType !== undefined) {
        setClauses.push('v.updateType = $updateType');
        setParams.updateType = input.updateType;
      }

      if (input.active !== undefined) {
        setClauses.push('v.active = $active');
        setParams.active = input.active;
      }

      const result = await session.executeWrite(async (tx) => {
        // First, get the app version to check if it exists and to get appId and platform
        const getResult = await tx.run(
          `
          MATCH (v:AppVersion {id: $id})
          RETURN v
          `,
          { id }
        );

        if (getResult.records.length === 0) {
          return null;
        }

        const appVersion = getResult.records[0].get('v').properties;

        // If setting to active, deactivate all other versions for this app and platform
        if (input.active === true) {
          await tx.run(
            `
            MATCH (v:AppVersion {appId: $appId, platform: $platform, active: true})
            WHERE v.id <> $id
            SET v.active = false, v.updatedAt = $now
            `,
            { appId: appVersion.appId, platform: appVersion.platform, id, now }
          );
        }

        // Update the app version
        const updateResult = await tx.run(
          `
          MATCH (v:AppVersion {id: $id})
          SET ${setClauses.join(', ')}
          RETURN v
          `,
          setParams
        );

        return updateResult.records[0].get('v').properties;
      });

      if (!result) {
        logger.info("App version not found for update", { id });
        return null;
      }

      logger.info("App version updated successfully", { id });
      
      return {
        id: result.id,
        appId: result.appId,
        platform: result.platform,
        version: result.version,
        minRequiredVersion: result.minRequiredVersion,
        updateUrl: result.updateUrl,
        fileSizeBytes: typeof result.fileSizeBytes?.toNumber === 'function' 
          ? result.fileSizeBytes.toNumber() 
          : result.fileSizeBytes,
        releaseNotes: result.releaseNotes,
        releaseDate: result.releaseDate,
        updatePriority: result.updatePriority,
        updateType: result.updateType,
        active: result.active,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (error) {
      logger.error("Error updating app version", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        id
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Delete an app version
   * 
   * @param id - App version ID
   * @returns True if deleted, false if not found
   */
  async deleteAppVersion(id: string): Promise<boolean> {
    const session = ledgerSpaceDriver.session();
    logger.debug("Deleting app version", { id });

    try {
      const result = await session.executeWrite(async (tx) => {
        const result = await tx.run(
          `
          MATCH (v:AppVersion {id: $id})
          DELETE v
          RETURN count(v) as count
          `,
          { id }
        );

        const count = result.records[0].get('count');
        return typeof count?.toNumber === 'function' ? count.toNumber() : count;
      });

      const deleted = result > 0;
      logger.info(deleted ? "App version deleted successfully" : "App version not found for deletion", { id });
      
      return deleted;
    } catch (error) {
      logger.error("Error deleting app version", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        id
      });
      throw error;
    } finally {
      await session.close();
    }
  }
}

export const appVersionRepository = new AppVersionRepository();
