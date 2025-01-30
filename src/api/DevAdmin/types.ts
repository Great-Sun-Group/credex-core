import { ApiActionType, ApiResponse } from "../../types/apiResponse";

/**
 * DevAdmin-specific API action types
 */
export enum DevAdminActionType {
  // Database actions
  DEV_ADMIN_DB_CLEARED = 'DEV_ADMIN_DB_CLEARED',
  DEV_ADMIN_DB_CLEAR_FAILED = 'DEV_ADMIN_DB_CLEAR_FAILED',
  
  // DCO actions
  DEV_ADMIN_DCO_FORCED = 'DEV_ADMIN_DCO_FORCED',
  DEV_ADMIN_DCO_FORCE_FAILED = 'DEV_ADMIN_DCO_FORCE_FAILED',
  
  // Audit actions
  DEV_ADMIN_AUDIT_RUN = 'DEV_ADMIN_AUDIT_RUN',
  DEV_ADMIN_AUDIT_COMPLETED = 'DEV_ADMIN_AUDIT_COMPLETED',
  DEV_ADMIN_AUDIT_FAILED = 'DEV_ADMIN_AUDIT_FAILED',
  
  // Member actions
  DEV_ADMIN_MEMBERS_LISTED = 'DEV_ADMIN_MEMBERS_LISTED',
  
  // Error actions
  DEV_ADMIN_ERROR_UNAUTHORIZED = 'DEV_ADMIN_ERROR_UNAUTHORIZED',
  DEV_ADMIN_ERROR_NOT_FOUND = 'DEV_ADMIN_ERROR_NOT_FOUND',
  DEV_ADMIN_ERROR_VALIDATION = 'DEV_ADMIN_ERROR_VALIDATION',
  DEV_ADMIN_ERROR_INTERNAL = 'DEV_ADMIN_ERROR_INTERNAL'
}

/**
 * Combined type for all possible dev admin action types
 */
export type DevAdminApiActionType = ApiActionType | DevAdminActionType;

/**
 * DevAdmin-specific response type
 */
export interface DevAdminResponse<T = unknown, D = unknown> extends Omit<ApiResponse<T, D>, 'data'> {
  data: {
    action: {
      id: string | null;
      type: DevAdminApiActionType;
      timestamp: string;
      actor: string;
      details: T;
    };
    dashboard: D;
  };
}

/**
 * DevAdmin action details interfaces
 */

export interface DevAdminDBClearDetails {
  clearedDatabases: string[];
  totalCleared: number;
  timestamp: string;
}

export interface DevAdminDCODetails {
  dcoID: string;
  status: string;
  timestamp: string;
  affectedAccounts?: number;
}

export interface DevAdminAuditDetails {
  success: boolean;
  timestamp: string;
  discrepancies?: Record<string, unknown>;
}

export interface DevAdminAuditDashboard {
  auditInfo: {
    success: boolean;
    timestamp: string;
  };
  stats?: {
    totalTrustAccounts: number;
    accountsWithDiscrepancies: number;
  };
}

export interface DevAdminMemberListDetails {
  totalMembers: number;
  pageSize: number;
  currentPage: number;
}

export interface DevAdminErrorDetails {
  code: string;
  reason: string;
  field?: string;
}

/**
 * DevAdmin dashboard interfaces
 */

export interface DevAdminDBDashboard {
  databases: Array<{
    name: string;
    status: string;
    lastCleared?: string;
  }>;
  systemInfo: {
    environment: string;
    timestamp: string;
  };
}

export interface DevAdminDCODashboard {
  dcoInfo: {
    id: string;
    status: string;
    startTime: string;
    endTime?: string;
  };
  stats: {
    totalAccounts: number;
    processedAccounts: number;
    failedAccounts: number;
  };
}

export interface DevAdminMemberDashboard {
  members: Array<{
    memberID: string;
    memberHandle: string;
    tier: number;
    createdAt: string;
  }>;
  pagination: {
    totalPages: number;
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
}

/**
 * Helper type for creating strongly-typed dev admin responses
 */
export type TypedDevAdminResponse<T, D = unknown> = DevAdminResponse<T, D>;
