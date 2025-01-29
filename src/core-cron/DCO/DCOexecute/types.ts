export interface Rates {
  [key: string]: number;
}

export interface Participant {
  accountID: string;
  DCOmemberID: string;
  DCOgiveInCXX: number;
  DCOgiveInDenom: number;
  DCOdenom: string;
  recurringID: string;
}

export interface ParticipantData {
  confirmedParticipants: Participant[];
  DCOinCXX: number;
  DCOinXAU: number;
  numberConfirmedParticipants: number;
}

export interface FoundationData {
  foundationID: string;
  foundationXOid: string;
}

export interface AuditDiscrepancy {
  secured: number;
  trust: number;
  difference: number;
  denomination: string;
}

export interface AuditDetails {
  timestamp: string;
  checksum: string;
  totalSecuredBalances: Record<string, number>;
  totalTrustBalances: Record<string, number>;
  matchStatus: boolean;
  discrepancies?: Record<string, AuditDiscrepancy>;
}

export interface AuditResult {
  success: boolean;
  details: AuditDetails;
}

export interface DailyAudit {
  auditID: string;
  timestamp: string;
  stage: 'PRE_DCO' | 'POST_DCO';
  checksum: string;
  totalSecuredBalances: string; // JSON stringified Record<string, number>
  totalTrustBalances: string; // JSON stringified Record<string, number>
  matchStatus: boolean;
  discrepancies: string; // JSON stringified Record<string, AuditDiscrepancy>
}

export interface AuditReport {
  reportID: string;
  timestamp: string;
  content: string;
}

export type AuditIncidentType = 'PRE_DCO_AUDIT_FAILURE' | 'POST_DCO_AUDIT_FAILURE';

export interface AuditIncident {
  incidentID: string;
  timestamp: string;
  type: AuditIncidentType;
  checksum: string;
  totalSecuredBalances: string; // JSON stringified Record<string, number>
  totalTrustBalances: string; // JSON stringified Record<string, number>
  discrepancies: string; // JSON stringified Record<string, AuditDiscrepancy>
  status: 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED';
  requiresInvestigation: boolean;
  investigationNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface BackupMetadata {
  timestamp: string;
  checksum: string;
  version: string;
  dcoProcessId: string;
  backupType: 'PRE_AUDIT' | 'POST_AUDIT' | 'PRE_RESTORE' | 'END_OF_DAY' | 'START_OF_DAY';
}

export interface DCOResult {
  newCXXrates: Rates;
  CXXprior_CXXcurrent: number;
  DCOinCXX: number;
  DCOinXAU: number;
  numberConfirmedParticipants: number;
  confirmedParticipants: Participant[];
}
