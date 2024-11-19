import { v4 as uuidv4 } from 'uuid';

/**
 * Test data types
 */
export interface MemberProfile {
  firstname: string;
  lastname: string;
  phone: string;
  defaultDenom: string;
}

export interface AccountConfig {
  accountType: 'PERSONAL' | 'BUSINESS' | 'CREDEX_FOUNDATION' | 'TRUST' | 'OPERATIONS';
  accountName: string;
  accountHandle: string;
  defaultDenom: string;
  DCOgiveInCXX?: number;
  DCOdenom?: string;
  isFoundationAudited?: boolean;
}

export interface CredexConfig {
  issuerAccountID: string;
  receiverAccountID: string;
  Denomination: string;
  InitialAmount: number;
  credexType: 'PURCHASE' | 'GIFT' | 'DCO_GIVE' | 'DCO_RECEIVE';
  OFFERSorREQUESTS: 'OFFERS' | 'REQUESTS';
  securedCredex: boolean;
  dueDate?: string;
}

export interface RecurringConfig {
  sourceAccountID: string;
  targetAccountID: string;
  templateType: 'REGULAR' | 'DCO_GIVE' | 'MEMBERTIER_SUBSCRIPTION';
  payFrequency: number;
  startDate: string;
  duration?: number;
  amount?: number;
  denomination?: string;
  securedCredex?: boolean;
  DCOgiveInCXX?: number;
  DCOdenom?: string;
  memberTier?: number;
}

/**
 * Generates unique test member profile
 */
export function generateMemberProfile(index: number): MemberProfile {
  const timestamp = Date.now().toString().slice(-7);
  return {
    firstname: `Test${index}`,
    lastname: `Member${index}`,
    phone: `+1${timestamp}${index.toString().padStart(3, '0')}`,
    defaultDenom: 'USD'
  };
}

/**
 * Generates test account configuration
 */
export function generateAccountConfig(
  type: AccountConfig['accountType'],
  index: number,
  isFoundationAudited = false
): AccountConfig {
  const baseConfig = {
    accountType: type,
    accountName: `Test ${type} Account ${index}`,
    accountHandle: `test_${type.toLowerCase()}_${index}`,
    defaultDenom: 'USD',
    isFoundationAudited
  };

  if (type === 'TRUST' && isFoundationAudited) {
    return {
      ...baseConfig,
      DCOgiveInCXX: 100,
      DCOdenom: 'USD'
    };
  }

  return baseConfig;
}

/**
 * Generates test credex configuration
 */
export function generateCredexConfig(
  issuerAccountID: string,
  receiverAccountID: string,
  amount: number,
  secured = true
): CredexConfig {
  return {
    issuerAccountID,
    receiverAccountID,
    Denomination: 'USD',
    InitialAmount: amount,
    credexType: 'PURCHASE',
    OFFERSorREQUESTS: 'OFFERS',
    securedCredex: secured
  };
}

/**
 * Generates test recurring payment configuration
 */
export function generateRecurringConfig(
  sourceAccountID: string,
  targetAccountID: string,
  type: RecurringConfig['templateType'] = 'REGULAR'
): RecurringConfig {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start tomorrow

  const baseConfig = {
    sourceAccountID,
    targetAccountID,
    templateType: type,
    payFrequency: 28,
    startDate: startDate.toISOString().split('T')[0]
  };

  if (type === 'REGULAR') {
    return {
      ...baseConfig,
      amount: 100,
      denomination: 'USD',
      securedCredex: true
    };
  }

  if (type === 'DCO_GIVE') {
    return {
      ...baseConfig,
      DCOgiveInCXX: 100,
      DCOdenom: 'USD'
    };
  }

  if (type === 'MEMBERTIER_SUBSCRIPTION') {
    return {
      ...baseConfig,
      memberTier: 3
    };
  }

  return baseConfig;
}

/**
 * Test data cleanup utilities
 */

export interface TestData {
  memberIDs: string[];
  accountIDs: string[];
  credexIDs: string[];
  recurringIDs: string[];
}

export class TestDataManager {
  private data: TestData = {
    memberIDs: [],
    accountIDs: [],
    credexIDs: [],
    recurringIDs: []
  };

  trackMemberID(id: string) {
    this.data.memberIDs.push(id);
  }

  trackAccountID(id: string) {
    this.data.accountIDs.push(id);
  }

  trackCredexID(id: string) {
    this.data.credexIDs.push(id);
  }

  trackRecurringID(id: string) {
    this.data.recurringIDs.push(id);
  }

  getTrackedData(): TestData {
    return { ...this.data };
  }

  clearTrackedData() {
    this.data = {
      memberIDs: [],
      accountIDs: [],
      credexIDs: [],
      recurringIDs: []
    };
  }
}

// Export singleton instance
export const testDataManager = new TestDataManager();
