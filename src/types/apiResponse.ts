/**
 * Standard API Response Types
 * These types define the standard response format for all API endpoints
 */

/**
 * Base action structure present in every response
 */
export interface ApiAction {
  id: string | null; // Resource ID (e.g., credexID)
  type: ApiActionType; // Business action (e.g., "CREDEX_ACCEPTED")
  timestamp: string; // When the action occurred (ISO 8601)
  actor: string; // Who performed the action (memberID/accountID)
  details: unknown; // Action-specific data structure
}

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown, D = unknown> {
  message: string; // Human-friendly message
  data: {
    action: ApiAction & { details: T }; // Action with typed details
    dashboard: D; // Full dashboard state
  };
}

/**
 * Base service result interface
 * Common structure for all service responses
 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * All possible API action types
 */
export enum ApiActionType {
  // Member actions
  MEMBER_LOGIN = "MEMBER_LOGIN",
  MEMBER_ONBOARDED = "MEMBER_ONBOARDED",
  MEMBER_FOUND = "MEMBER_FOUND",
  MEMBER_UPDATE = "MEMBER_UPDATE",
  MEMBER_PASSWORD_UPDATED = "MEMBER_PASSWORD_UPDATED",
  MEMBER_PASSWORD_RESET = "MEMBER_PASSWORD_RESET",
  DASHBOARD_RETRIEVED = "DASHBOARD_RETRIEVED",
  SPEND_AUTHORIZED = "SPEND_AUTHORIZED",
  HUSTLER_10K_ENROLLED = "HUSTLER_10K_ENROLLED",
  
  // App actions
  APP_VERSION_CHECK = "APP_VERSION_CHECK",

  // Account actions
  ACCOUNT_CREATED = "ACCOUNT_CREATED",
  ACCOUNT_INTERNAL_CREATED = "ACCOUNT_INTERNAL_CREATED",
  ACCOUNT_AUTHORIZED = "ACCOUNT_AUTHORIZED",
  ACCOUNT_UNAUTHORIZED = "ACCOUNT_UNAUTHORIZED",
  ACCOUNT_UPDATED = "ACCOUNT_UPDATED",
  ACCOUNT_FOUND = "ACCOUNT_FOUND",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_AUTHORIZATION_FAILED = "ACCOUNT_AUTHORIZATION_FAILED",
  BALANCES_RETRIEVED = "BALANCES_RETRIEVED",
  LEDGER_RETRIEVED = "LEDGER_RETRIEVED",
  SEND_OFFERS_UPDATED = "SEND_OFFERS_UPDATED",

  // Credex actions
  CREDEX_CREATED = "CREDEX_CREATED",
  CREDEX_ACCEPTED = "CREDEX_ACCEPTED",
  CREDEX_DECLINED = "CREDEX_DECLINED",
  CREDEX_CANCELLED = "CREDEX_CANCELLED",
  CREDEX_RETRIEVED = "CREDEX_RETRIEVED",
  CREDEX_CREATE_FAILED = "CREDEX_CREATE_FAILED",
  CREDEX_BULK_ACCEPTED = "CREDEX_BULK_ACCEPTED",

  // Recurring actions
  RECURRING_CREATED = "RECURRING_CREATED",
  RECURRING_ACCEPTED = "RECURRING_ACCEPTED",
  RECURRING_CANCELLED = "RECURRING_CANCELLED",
  RECURRING_RETRIEVED = "RECURRING_RETRIEVED",

  // DevAdmin actions
  DEV_DBS_CLEARED = "DEV_DBS_CLEARED",
  DEV_DCO_FORCED = "DEV_DCO_FORCED",
  DEV_ACTION_FAILED = "DEV_ACTION_FAILED",

  // Error actions
  ERROR_UNAUTHORIZED = "ERROR_UNAUTHORIZED",
  ERROR_NOT_FOUND = "ERROR_NOT_FOUND",
  ERROR_VALIDATION = "ERROR_VALIDATION",
  ERROR_INTERNAL = "ERROR_INTERNAL",

  // Trust account actions
  TRUST_ACCOUNT_CREATED = "TRUST_ACCOUNT_CREATED",
  
  // Store actions
  STORE_STATUS_UPDATED = "STORE_STATUS_UPDATED",
}

/**
 * Common details structures for different action types
 */

export interface CredexCreditRating {
  redeemedTotal: number;
  outstandingTotal: number;
  defaultedTotal: number;
  writtenOffTotal: number;
  denomination: string;
}

export interface CredexActionDetails {
  amount: string;
  denomination: string;
  securedCredex: boolean;
  dueDate?: string | null; // Added for unsecured Credex creation
  receiverAccountID?: string; // Legacy field - for backward compatibility during migration
  receiverAccountName?: string; // Legacy field - for backward compatibility during migration
  acceptorAccountID?: string;
  acceptorAccountName?: string;
  issuerAccountID?: string;
  issuerAccountName?: string;
  reason?: string;
  limit?: string;
  transactionType?: string;
  invoiceID?: string;
  // Member data fields for enhanced Credex details
  issuerMemberID?: string;
  issuerFirstName?: string;
  issuerLastName?: string;
  issuerHandle?: string;
  issuerTier?: number;
  issuerProfilePicture?: string;
  acceptorMemberID?: string;
  acceptorFirstName?: string;
  acceptorLastName?: string;
  acceptorHandle?: string;
  acceptorTier?: number;
  acceptorProfilePicture?: string;
  // Credit ratings (only for unsecured credexes)
  issuerCreditRating?: CredexCreditRating;
  acceptorCreditRating?: CredexCreditRating;
  // Additional fields for Credex retrieval
  status?: {
    outstandingAmount: string;
    redeemedAmount: string;
    defaultedAmount: string;
    writtenOffAmount: string;
    acceptedAt?: string;
    declinedAt?: string;
    cancelledAt?: string;
    dueDate?: string;
  };
  clearedAgainst?: Array<{
    credexID: string;
    amount: string;
    initialAmount: string;
    counterpartyName: string;
  }>;
}

export interface CredexBulkActionDetails {
  summary: {
    accepted: string[];
    alreadyAccepted: string[];
    failed: Array<{
      credexID: string;
      error: string;
    }>;
  };
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface MemberActionDetails {
  memberID: string;
  handle?: string;
  phone?: string;
  tier?: string;
  spendLimit?: string;
  token?: string;
  version?: 'v1' | 'v2';
  authMethod?: 'phone_only' | 'password';
  otpVerified?: boolean;
  resetToken?: string;
  verificationToken?: string;
  purpose?: 'PASSWORD_RESET';
  expiresIn?: number;
  verified?: boolean;
  verifiedAt?: string;
}

export interface AccountActionDetails {
  accountID: string;
  accountName?: string;
  accountHandle?: string;
  memberID?: string;
  memberName?: string;
  memberHandle?: string;
  defaultDenom?: string;
  ownerID?: string;
  memberIdAuthorized?: string;
  memberIdUnauthorized?: string;
  storeOpen?: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
  creditRating?: {
    redeemedTotalUSD: number;
    outstandingTotalUSD: number;
    defaultedTotalUSD: number;
    writtenOffTotalUSD: number;
  };
  balances?: {
    securedNetBalancesByDenom?: string[];
    unsecuredBalancesInDefaultDenom?: {
      totalPayables: string;
      totalReceivables: string;
      netPayRec: string;
    };
    netCredexAssetsInDefaultDenom?: string;
  };
  ledger?: Array<{
    timestamp: string;
    type: string;
    amount: string;
    denomination: string;
    description: string;
  }>;
  sendOffersTo?: {
    memberID: string;
    firstname: string;
    lastname: string;
  };
  authFor?: Array<{
    memberID: string;
    firstname: string;
    lastname: string;
  }>;
}

export interface RecurringActionDetails {
  recurringID: string;
  amount: string;
  denomination: string;
  payFrequency: number;
  nextDate: string;
  status: string;
}

export interface DevAdminActionDetails {
  environment: string;
  action: string;
  affectedDatabases?: string[];
  dcoDetails?: {
    timestamp: string;
    forcedBy: string;
  };
}

export interface ErrorActionDetails {
  code: string;
  reason: string;
  field?: string;
  suggestion?: string;
}

export interface AppActionDetails {
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

/**
 * Helper type to create strongly-typed responses
 */
export type TypedApiResponse<T, D = unknown> = ApiResponse<T, D>;

/**
 * Example usage:
 *
 * // For a credex creation response:
 * type CredexResponse = TypedApiResponse<CredexActionDetails, DashboardState>;
 *
 * // For a member login response:
 * type LoginResponse = TypedApiResponse<MemberActionDetails, MemberDashboard>;
 *
 * // For an error response:
 * type ErrorResponse = TypedApiResponse<ErrorActionDetails>;
 */
