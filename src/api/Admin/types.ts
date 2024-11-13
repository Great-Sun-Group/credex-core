import { ApiActionType, ApiResponse } from "../../types/apiResponse";

/**
 * Admin-specific API action types
 */
export enum AdminActionType {
  // Member actions
  ADMIN_MEMBER_FOUND = 'ADMIN_MEMBER_FOUND',
  ADMIN_MEMBER_UPDATED = 'ADMIN_MEMBER_UPDATED',
  
  // Account actions
  ADMIN_ACCOUNT_FOUND = 'ADMIN_ACCOUNT_FOUND',
  ADMIN_ACCOUNT_UPDATED = 'ADMIN_ACCOUNT_UPDATED',
  
  // Credex actions
  ADMIN_CREDEX_FOUND = 'ADMIN_CREDEX_FOUND',
  ADMIN_CREDEX_OFFERS_FOUND = 'ADMIN_CREDEX_OFFERS_FOUND',

  // Error actions
  ADMIN_ERROR_UNAUTHORIZED = 'ADMIN_ERROR_UNAUTHORIZED',
  ADMIN_ERROR_NOT_FOUND = 'ADMIN_ERROR_NOT_FOUND',
  ADMIN_ERROR_VALIDATION = 'ADMIN_ERROR_VALIDATION',
  ADMIN_ERROR_INTERNAL = 'ADMIN_ERROR_INTERNAL'
}

/**
 * Combined type for all possible admin action types
 */
export type AdminApiActionType = ApiActionType | AdminActionType;

/**
 * Admin-specific response type
 */
export interface AdminResponse<T = unknown, D = unknown> extends Omit<ApiResponse<T, D>, 'data'> {
  data: {
    action: {
      id: string | null;
      type: AdminApiActionType;
      timestamp: string;
      actor: string;
      details: T;
    };
    dashboard: D;
  };
}

/**
 * Admin action details interfaces
 */

export interface AdminMemberDetails {
  memberID: string;
  handle?: string;
  phone?: string;
  tier?: string;
  firstname?: string;
  lastname?: string;
  defaultDenom?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface AdminCredexDetails {
  credexID: string;
  type: string;
  denomination: string;
  initialAmount: string;
  status: string;
  secured: boolean;
  outstandingAmount?: string;
  defaultedAmount?: string;
  redeemedAmount?: string;
  writtenOffAmount?: string;
  dueDate?: string;
  cxxMultiplier?: number;
  acceptedAt?: string;
  declinedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
}

export interface AdminCredexOfferDetails {
  accountID: string;
  offersCount: number;
  totalInitialAmount: string;
  totalOutstandingAmount: string;
}

export interface AdminAccountDetails {
  accountID: string;
  accountName: string;
  accountHandle: string;
  accountType: string;
  ownerID: string;
  ownerHandle?: string;
  ownerTier?: number;
  defaultDenom?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminErrorDetails {
  code: string;
  reason: string;
  field?: string;
}

/**
 * Admin dashboard interfaces
 */

export interface AdminMemberDashboard {
  memberInfo: {
    memberID: string;
    firstname: string;
    lastname: string;
    phone: string;
    memberHandle: string;
    memberTier: number;
    defaultDenom: string;
    updatedAt: string;
    createdAt: string;
  };
}

export interface AdminCredexDashboard {
  credexInfo: {
    credexID: string;
    type: string;
    denomination: string;
    initialAmount: string;
    outstandingAmount: string;
    defaultedAmount: string;
    redeemedAmount: string;
    status: string;
    cxxMultiplier: number;
    writtenOffAmount: string;
    dueDate: string;
    acceptedAt: string;
    declinedAt: string;
    cancelledAt: string;
    createdAt: string;
  };
  relationships: {
    issuer: {
      accountID: string;
      accountName: string;
      accountHandle: string;
      accountType: string;
      ownerID: string;
      signerID: string;
    };
    acceptor: {
      accountID: string;
      accountName: string;
      accountHandle: string;
      accountType: string;
      ownerID: string;
      signerID: string;
    };
    securer: {
      accountID: string;
      accountName: string;
    } | null;
  };
}

export interface AdminCredexOfferDashboard {
  accountInfo: {
    accountID: string;
    defaultDenom: string;
  };
  offers: Array<{
    credexID: string;
    type: string;
    denomination: string;
    initialAmount: string;
    outstandingAmount: string;
    defaultedAmount: string;
    redeemedAmount: string;
    status: string;
    cxxMultiplier: number;
    writtenOffAmount: string;
    dueDate: string;
    createdAt: string;
    sender: {
      accountID: string;
      accountHandle: string;
    };
  }>;
}

export interface AdminAccountDashboard {
  accountInfo: {
    accountID: string;
    accountName: string;
    accountHandle: string;
    accountType: string;
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    memberID: string;
    memberHandle: string;
    memberTier: number;
  };
  credexStats: {
    numberOfCredexOwed: number;
    owedCredexes: string[];
    owedAccounts: string[];
  };
}

/**
 * Helper type for creating strongly-typed admin responses
 */
export type TypedAdminResponse<T, D = unknown> = AdminResponse<T, D>;
