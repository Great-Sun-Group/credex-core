import { Session } from "neo4j-driver";
import { Request, Response, NextFunction } from "express";

export interface InitialMemberResult {
  onboardedMemberID: string;
  defaultAccountID: string;
}

// Using Record type for base rates and extending with required properties
export interface DayZeroRates extends Record<string, number> {
  CXX: number;
  CAD: number;
  USD: number;
  XAU: number;
}

export interface DatabaseSessions {
  ledgerSpace: Session;
  searchSpace: Session;
}

export interface DCOParticipantRateRequest extends Request {
  body: {
    accountID: string;
    DCOgiveInCXX: number;
    DCOdenom: string;
  };
}

export interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface CredexResult {
  credexID: string;
  [key: string]: any;
}
