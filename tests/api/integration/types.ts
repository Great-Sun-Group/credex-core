// Common types used across integration tests
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
