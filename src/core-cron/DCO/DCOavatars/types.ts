import { DCO_CONSTANTS } from "../constants";

export type TemplateType = "DCO_GIVE" | "REGULAR";
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

export interface CreateCredexResult {
  credex: CredexObject | boolean;
  message: string;
}

export interface CredexOfferResult {
  credex: CredexObject | boolean;
  message: string;
}

export interface AvatarData {
  avatar: Avatar;
  issuerAccountID: string;
  acceptorAccountID: string;
  date: string;
}

// Type guard to check if credex is a CredexObject
export function isCredexObject(credex: CredexObject | boolean): credex is CredexObject {
  return typeof credex === 'object' && credex !== null && 'credexID' in credex;
}
