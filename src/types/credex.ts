/**
 * Shared type definitions for Credex-related interfaces
 */

/**
 * Represents a Credex offer with standardized properties
 */
export interface OfferedCredex {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  dueDate?: string | null;
  secured?: boolean;
  counterpartyCreditRating?: {
    redeemedTotalUSD: number;
    outstandingTotalUSD: number;
    defaultedTotalUSD: number;
    writtenOffTotalUSD: number;
  };
}

/**
 * Represents Credex data for DCO operations
 */
export interface DCOCredexData {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  secured: boolean;
  dueDate?: string | null;
  transactionType: string;
  issuerAccountID: string;
  issuerAccountName: string;
  receiverAccountID: string;
  receiverMemberID: string | null;
  issuerMemberID: string | null;
  createdAt: string;
  cxxMultiplier: number;
}

/**
 * Represents data returned from CreateCredex service
 */
export interface CreateCredexData {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  secured: boolean;
  dueDate?: string | null;
  transactionType: string;
  issuerAccountID: string;
  issuerAccountName: string;
  receiverAccountID: string;
  receiverMemberID: string | null;
  issuerMemberID: string | null;
  createdAt: string;
  cxxMultiplier: number;
}
