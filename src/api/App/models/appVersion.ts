/**
 * App Version Model
 * 
 * Defines the structure and types for app version data.
 */

export interface AppVersion {
  id: string;
  appId: string;
  platform: 'android' | 'ios';
  version: string;
  minRequiredVersion: string;
  updateUrl: string;
  fileSizeBytes: number;
  releaseNotes: string;
  releaseDate: string;
  updatePriority: 'low' | 'medium' | 'high' | 'critical';
  updateType: 'patch' | 'minor' | 'major';
  active: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Checksum fields
  checksumAlgorithm: string;
  checksumUniversal: string;
  checksumArm64: string;
  checksumArm: string;
  checksumX86_64: string;
  checksumUrl: string;
  architectureSpecificDownloads: {
    'arm64-v8a': string;
    'armeabi-v7a': string;
    'x86_64': string;
  };
}

export interface AppVersionCreateInput {
  appId: string;
  platform: 'android' | 'ios';
  version: string;
  minRequiredVersion: string;
  updateUrl: string;
  fileSizeBytes: number;
  releaseNotes: string;
  releaseDate: string;
  updatePriority: 'low' | 'medium' | 'high' | 'critical';
  updateType: 'patch' | 'minor' | 'major';
  active?: boolean;
  
  // Checksum fields
  checksumAlgorithm: string;
  checksumUniversal: string;
  checksumArm64: string;
  checksumArm: string;
  checksumX86_64: string;
  checksumUrl: string;
  architectureSpecificDownloads: {
    'arm64-v8a': string;
    'armeabi-v7a': string;
    'x86_64': string;
  };
}

export interface AppVersionUpdateInput {
  version?: string;
  minRequiredVersion?: string;
  updateUrl?: string;
  fileSizeBytes?: number;
  releaseNotes?: string;
  releaseDate?: string;
  updatePriority?: 'low' | 'medium' | 'high' | 'critical';
  updateType?: 'patch' | 'minor' | 'major';
  active?: boolean;
  
  // Checksum fields
  checksumAlgorithm?: string;
  checksumUniversal?: string;
  checksumArm64?: string;
  checksumArm?: string;
  checksumX86_64?: string;
  checksumUrl?: string;
  architectureSpecificDownloads?: {
    'arm64-v8a': string;
    'armeabi-v7a': string;
    'x86_64': string;
  };
}

export interface AppVersionResponse {
  update_available: boolean;
  latest_version?: string;
  update_required?: boolean;
  update_priority?: 'low' | 'medium' | 'high' | 'critical';
  update_type?: 'patch' | 'minor' | 'major';
  update_url?: string;
  file_size_bytes?: number;
  release_notes?: string;
  release_date?: string;
  
  // New fields for checksums
  integrity?: {
    algorithm: string;
    checksum: string;
    checksumUrl: string;
  };
  architecture_specific_downloads?: {
    [key: string]: {
      url: string;
      checksum: string;
    };
  };
}
