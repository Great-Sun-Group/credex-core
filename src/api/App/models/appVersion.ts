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
}
