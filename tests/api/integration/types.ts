// Common types used across integration tests

// API Response Types
export interface ApiAction {
  id: string;
  type: string;
  timestamp: string;
  actor: string;
  details: Record<string, any>;
}

export interface ApiResponse<T = any> {
  message: string;
  data: {
    action: ApiAction;
    dashboard: T;
  }
}

// Test Data Types
export interface MemberData {
  jwt: string;
  memberID: string;
  accountIDs: string[];
}

export interface BennitaData {
  memberID: string;
  accountID: string;
}

export interface CredexIDs {
  secured11USD: string;
  unsecured10USD: string;
  failed001USD: string;
  unsecured5USD: string;
  unsecured2USD: string;
  unsecured1USD: string;
  unsecured7USD: string;
  failed001USDBalance: string;
  unsecured6USD: string;
}

// Shared test data between test files
export interface TestData {
  member1: MemberData;
  member2: MemberData;
  member3: MemberData;
  bennita: BennitaData;
  credexIDs: CredexIDs;
}

// Error Response Types
export interface ErrorDetails {
  code: string;
  reason?: string;
  field?: string;
}

export interface ErrorAction extends ApiAction {
  details: ErrorDetails;
}

export interface ErrorResponse {
  message: string;
  data: {
    action: ErrorAction;
    dashboard: null;
  }
}
