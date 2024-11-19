import { ApiAction } from '../integration/types';

/**
 * Validates standardized API response structure
 */
export interface ApiResponse {
  message: string;
  data: {
    action: ApiAction;
    dashboard: any; // Type will be specific to endpoint
  };
}

/**
 * Validates action object structure and required fields
 */
export function validateAction(action: ApiAction): void {
  // Required fields
  if (!action.id && action.id !== null) {
    throw new Error('Action missing id field');
  }
  if (!action.type) {
    throw new Error('Action missing type field');
  }
  if (!action.timestamp) {
    throw new Error('Action missing timestamp field');
  }
  if (!action.actor) {
    throw new Error('Action missing actor field');
  }
  if (!action.details) {
    throw new Error('Action missing details field');
  }

  // Timestamp format
  if (!isValidISODate(action.timestamp)) {
    throw new Error('Invalid timestamp format');
  }
}

/**
 * Validates error response structure
 */
export interface ErrorResponse {
  message: string;
  data: {
    action: {
      id: string | null;
      type: string;
      timestamp: string;
      actor: string;
      details: {
        code: string;
        reason?: string;
        field?: string;
      };
    };
    dashboard: any;
  };
}

/**
 * Validates error action structure
 */
export function validateErrorAction(action: ApiAction): void {
  validateAction(action);
  
  // Error actions should have error details
  if (!action.details.code) {
    throw new Error('Error action missing code');
  }
}

/**
 * Validates response matches expected status code
 */
export function validateStatusCode(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`Expected status code ${expected} but got ${actual}`);
  }
}

/**
 * Helper to validate ISO date string
 */
function isValidISODate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates secured credex balance rules
 */
export function validateSecuredBalances(
  accountType: string,
  isFoundationAudited: boolean,
  currentBalance: number,
  requestedAmount: number
): void {
  if (isFoundationAudited) {
    // FOUNDATION_AUDITED accounts can issue unlimited secured credex
    return;
  }

  // All other accounts limited by current secured balance
  if (requestedAmount > currentBalance) {
    throw new Error('Requested amount exceeds secured balance');
  }
}

/**
 * Validates dashboard state based on account type
 */
export function validateDashboardState(
  accountType: string,
  isFoundationAudited: boolean,
  dashboard: any
): void {
  // Common validations
  if (!dashboard.accounts) {
    throw new Error('Dashboard missing accounts array');
  }

  // FOUNDATION_AUDITED specific validations
  if (isFoundationAudited) {
    const account = dashboard.accounts.find(
      (a: any) => a.type === accountType
    );
    if (!account) {
      throw new Error('FOUNDATION_AUDITED account not found in dashboard');
    }
  }
}
