import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import logger from '../../../utils/logger';
import { AppVersionRepository } from '../../App/repositories/appVersionRepository';

export interface ApkUploadResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface VersionInfo {
  version: string;
  updateRequired: boolean;
  releaseNotes: string;
  fileSizeBytes: number;
  downloadUrl: string;
  checksum: string;
}

export class ApkService {
  private static instance: ApkService;
  private apkStoragePath: string;
  private appVersionRepo: AppVersionRepository;

  private constructor() {
    this.apkStoragePath = path.join(process.cwd(), 'vimbisopay_apk');
    this.appVersionRepo = new AppVersionRepository();
    this.initializeStorage();
  }

  public static getInstance(): ApkService {
    if (!ApkService.instance) {
      ApkService.instance = new ApkService();
    }
    return ApkService.instance;
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.apkStoragePath, { recursive: true });
      logger.info(`APK storage initialized at: ${this.apkStoragePath}`);
    } catch (error) {
      logger.error('Failed to initialize APK storage:', error);
    }
  }

  public async uploadApk(
    fileBuffer: Buffer,
    version: string,
    updateRequired: boolean,
    releaseNotes: string
  ): Promise<ApkUploadResult> {
    const uploadId = `apk-upload-${Date.now()}`;
    logger.info(`Starting APK upload ${uploadId}`, { version, updateRequired });

    try {
      // Validate APK file (basic validation)
      if (!this.isValidApkBuffer(fileBuffer)) {
        return {
          success: false,
          message: 'Invalid APK file format'
        };
      }

      // Generate filename and paths
      const filename = `vimbisopay-${version}.apk`;
      const filePath = path.join(this.apkStoragePath, filename);
      const latestPath = path.join(this.apkStoragePath, 'vimbisopay-latest.apk');

      // Calculate file checksum
      const checksum = this.calculateChecksum(fileBuffer);
      const fileSizeBytes = fileBuffer.length;

      // Save APK file
      await fs.writeFile(filePath, fileBuffer);
      
      // Update latest symlink/copy
      await fs.copyFile(filePath, latestPath);

      // Generate download URL
      const downloadUrl = `/downloads/vimbisopay-${version}.apk`;
      const latestDownloadUrl = '/downloads/vimbisopay-latest.apk';

      // Update app version in database
      const versionUpdateResult = await this.updateAppVersion({
        version,
        updateRequired,
        releaseNotes,
        fileSizeBytes,
        downloadUrl,
        checksum
      });

      if (!versionUpdateResult.success) {
        // Clean up uploaded file if database update fails
        await fs.unlink(filePath).catch(() => {});
        await fs.unlink(latestPath).catch(() => {});
        
        return {
          success: false,
          message: 'Failed to update app version in database',
          details: versionUpdateResult.details
        };
      }

      logger.info(`Successfully uploaded APK ${uploadId}`, { 
        version, 
        filename, 
        fileSizeBytes, 
        checksum 
      });

      return {
        success: true,
        message: 'APK uploaded successfully',
        details: {
          uploadId,
          version,
          filename,
          fileSizeBytes,
          checksum,
          downloadUrl,
          latestDownloadUrl,
          updateRequired,
          releaseNotes,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to upload APK ${uploadId}:`, error);
      return {
        success: false,
        message: `APK upload failed: ${errorMessage}`,
        details: { error: errorMessage, uploadId }
      };
    }
  }

  public async getApkPath(version?: string): Promise<string | null> {
    try {
      const filename = version ? `vimbisopay-${version}.apk` : 'vimbisopay-latest.apk';
      const filePath = path.join(this.apkStoragePath, filename);
      
      // Check if file exists
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  public async listAvailableVersions(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.apkStoragePath);
      const apkFiles = files.filter(file => 
        file.startsWith('vimbisopay-') && 
        file.endsWith('.apk') && 
        file !== 'vimbisopay-latest.apk'
      );
      
      // Extract version numbers from filenames
      const versions = apkFiles.map(file => {
        const match = file.match(/vimbisopay-(.+)\.apk$/);
        return match ? match[1] : null;
      }).filter(Boolean) as string[];

      // Sort versions (basic string sort, could be improved with semver)
      return versions.sort();
    } catch (error) {
      logger.error('Failed to list available versions:', error);
      return [];
    }
  }

  public async deleteVersion(version: string): Promise<boolean> {
    try {
      const filename = `vimbisopay-${version}.apk`;
      const filePath = path.join(this.apkStoragePath, filename);
      
      await fs.unlink(filePath);
      logger.info(`Deleted APK version: ${version}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete APK version ${version}:`, error);
      return false;
    }
  }

  public async getVersionInfo(version: string): Promise<VersionInfo | null> {
    try {
      const filePath = await this.getApkPath(version);
      if (!filePath) {
        return null;
      }

      const stats = await fs.stat(filePath);
      const fileBuffer = await fs.readFile(filePath);
      const checksum = this.calculateChecksum(fileBuffer);

      // Get version details from database
      const appVersion = await this.appVersionRepo.getLatestAppVersion('com.vimbisopay.app', 'android');
      
      if (!appVersion || appVersion.version !== version) {
        return null;
      }

      return {
        version,
        updateRequired: appVersion.minRequiredVersion !== null,
        releaseNotes: appVersion.releaseNotes,
        fileSizeBytes: stats.size,
        downloadUrl: `/downloads/vimbisopay-${version}.apk`,
        checksum
      };
    } catch (error) {
      logger.error(`Failed to get version info for ${version}:`, error);
      return null;
    }
  }

  private isValidApkBuffer(buffer: Buffer): boolean {
    // Basic APK validation - check for ZIP signature (APK is a ZIP file)
    const zipSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // "PK\x03\x04"
    const altZipSignature = Buffer.from([0x50, 0x4B, 0x05, 0x06]); // "PK\x05\x06"
    
    return buffer.length > 4 && (
      buffer.subarray(0, 4).equals(zipSignature) ||
      buffer.subarray(0, 4).equals(altZipSignature)
    );
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async updateAppVersion(versionInfo: VersionInfo): Promise<ApkUploadResult> {
    try {
      const appId = 'com.vimbisopay.app';
      
      // Calculate version increment based on update_required
      const currentVersion = await this.appVersionRepo.getLatestAppVersion(appId, 'android');
      let newVersion = versionInfo.version;

      // If version wasn't explicitly provided, auto-increment
      if (!newVersion && currentVersion) {
        newVersion = this.incrementVersion(currentVersion.version, versionInfo.updateRequired);
      }

      // Create new app version record
      const versionData = {
        appId: appId,
        platform: 'android' as const,
        version: newVersion,
        minRequiredVersion: versionInfo.updateRequired ? newVersion : '',
        updateUrl: versionInfo.downloadUrl,
        fileSizeBytes: versionInfo.fileSizeBytes,
        releaseNotes: versionInfo.releaseNotes,
        releaseDate: new Date().toISOString(),
        updatePriority: (versionInfo.updateRequired ? 'high' : 'medium') as 'high' | 'medium' | 'low' | 'critical',
        updateType: (versionInfo.updateRequired ? 'minor' : 'patch') as 'patch' | 'minor' | 'major',
        active: true,
        checksumAlgorithm: 'sha256',
        checksumUniversal: versionInfo.checksum,
        checksumArm64: '',
        checksumArm: '',
        checksumX86_64: '',
        checksumUrl: '',
        architectureSpecificDownloads: {
          'arm64-v8a': '',
          'armeabi-v7a': '',
          'x86_64': ''
        }
      };

      // Save new version (the repository handles deactivating previous versions if this is active)
      const result = await this.appVersionRepo.createAppVersion(versionData);

      return {
        success: true,
        message: 'App version updated successfully',
        details: { versionData, result }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update app version:', error);
      return {
        success: false,
        message: `Failed to update app version: ${errorMessage}`,
        details: { error: errorMessage }
      };
    }
  }

  private incrementVersion(currentVersion: string, isRequired: boolean): string {
    // Parse version string (e.g., "1.2.3" or "1.2.3+45")
    const versionMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(\+\d+)?$/);
    if (!versionMatch) {
      throw new Error(`Invalid version format: ${currentVersion}`);
    }

    let [, major, minor, patch, build] = versionMatch;
    let majorNum = parseInt(major, 10);
    let minorNum = parseInt(minor, 10);
    let patchNum = parseInt(patch, 10);

    if (isRequired) {
      // Required update: increment minor, reset patch
      minorNum += 1;
      patchNum = 0;
    } else {
      // Optional update: increment patch
      patchNum += 1;
    }

    // Return new version (without build number for now)
    return `${majorNum}.${minorNum}.${patchNum}`;
  }
}
