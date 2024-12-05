import { DCO_CONSTANTS } from "../constants";
import { ServiceResult } from "../../../types/apiResponse";
import { TEMPLATE_TYPES } from "../../../api/Recurring/types";

export type TemplateType = typeof TEMPLATE_TYPES[keyof typeof TEMPLATE_TYPES];
export type TemplateStatus = typeof DCO_CONSTANTS.RECURRING.STATUS[keyof typeof DCO_CONSTANTS.RECURRING.STATUS];

export interface Avatar {
  signerID: string;  // Changed from memberID to make it clear this can be any valid signer
  Denomination: string;
  InitialAmount: number;
  securedCredex: boolean;
  credspan: string;
  remainingPays: number | null;
  nextPayDate: string | null;
  dueDate?: string;
  status: TemplateStatus;
  templateType: TemplateType;
  lastProcessed?: string;
}

export interface CredexObject {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  secured: boolean;
  dueDate?: string;
}

// DCO-specific Credex data interface
export interface DCOCredexData {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  secured: boolean;
  dueDate?: string;
  transactionType: string;
  issuerAccountID: string;
  receiverAccountID: string;
  createdAt: string;
  cxxMultiplier: number;
}

// Extend ServiceResult for DCO-specific needs
export interface DCOCreateCredexResult extends ServiceResult<DCOCredexData> {}

// Use DCOCreateCredexResult for CredexOfferResult to maintain consistency
export type CredexOfferResult = DCOCreateCredexResult;

export interface AvatarData {
  avatar: Avatar;
  issuerAccountID: string;
  acceptorAccountID: string;
  date: string;
}

// Type guard to check if credex data exists and has required properties
export function isCredexObject(data: any): data is CredexObject {
  return (
    typeof data === 'object' &&
    data !== null &&
    'credexID' in data &&
    'formattedInitialAmount' in data &&
    'counterpartyAccountName' in data &&
    'secured' in data
  );
}

// Type guard to check if result has valid credex data
export function hasValidCredexData(result: DCOCreateCredexResult): result is DCOCreateCredexResult {
  return (
    result.success &&
    result.data !== undefined &&
    'credexID' in result.data &&
    'formattedInitialAmount' in result.data &&
    'counterpartyAccountName' in result.data
  );
}
