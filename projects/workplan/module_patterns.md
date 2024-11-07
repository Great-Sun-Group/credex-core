# Module-Specific Patterns Guide

This guide documents the patterns identified in existing modules (Credex, Member, Account, Recurring) to inform the standardization of new modules.

## Entity Identification Patterns

### Member Module
- Phone-based lookup for authentication flows
- Handle-based lookup for discovery/social features
- UUID for internal operations
- Rationale: Different lookup methods serve specific user experience needs

### Account Module
- Handle-based lookup for discovery
- UUID for internal operations and relationships
- Rationale: Balances public discovery with secure operations

### Credex Module
- UUID-only for all operations
- No handle-based lookups needed
- Rationale: Internal transaction system, no public discovery needed

### Recurring Module
- UUID-only for all operations
- Schedule-based identification
- Rationale: Internal scheduling system, no public discovery needed

## Authorization Patterns

### Member Module
- Tier-based authorization checks
- Phone verification flows
- Membership level validations
```typescript
// Example from AuthForTierSpendLimit
if (memberTier <= 2 && !securedCredex) {
  throw new MemberError(
    "Unsecured credex not permitted on this tier",
    "TIER_LIMIT",
    403
  );
}
```

### Account Module
- Owner vs authorized user checks
- Multi-member authorization tracking
- Authorization limit validations
```typescript
// Example from AuthorizeForAccount
const numAuthorized = await getAuthorizationCount(accountID);
if (numAuthorized >= 5) {
  throw new AccountError(
    "Authorization limit reached",
    "AUTH_LIMIT",
    400
  );
}
```

### Credex Module
- Transaction-based authorization
- Balance and limit checks
- Secured vs unsecured validations
```typescript
// Example from CreateCredex
if (securedCredex && secureableAmount < amount) {
  throw new CredexError(
    "Insufficient securable balance",
    "INSUFFICIENT_BALANCE",
    400
  );
}
```

### Recurring Module
- Owner-only modification rights
- Schedule validation checks
- Active status validations
```typescript
// Example from CreateRecurring
if (!isOwner) {
  throw new RecurringError(
    "Only account owner can create recurring transactions",
    "UNAUTHORIZED",
    403
  );
}
```

## Data Relationship Patterns

### Member Module
```typescript
// Core relationships
MATCH (member:Member)-[:OWNS]->(account:Account)
MATCH (member)-[:AUTHORIZED_FOR]->(authorizedAccounts:Account)
```

### Account Module
```typescript
// Core relationships
MATCH (account:Account)<-[:OWNS]-(owner:Member)
MATCH (account)<-[:AUTHORIZED_FOR]-(authorizedMembers:Member)
```

### Credex Module
```typescript
// Core relationships
MATCH (issuer:Account)-[rel:OFFERS|OWES]->(credex:Credex)
  -[rel2:OFFERS|OWES]->(receiver:Account)
OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
```

### Recurring Module
```typescript
// Core relationships
MATCH (sourceAccount:Account)-[:SCHEDULES]->(recurring:Recurring)
  -[:TARGETS]->(targetAccount:Account)
MATCH (recurring)-[:ACTIVE]-(targetAccount:Account)
OPTIONAL MATCH (recurring)-[:LAST_RUN]->(execution:Execution)
```

## Response Patterns

### Member Module
```typescript
interface MemberResponse {
  success: boolean;
  data?: {
    memberID: string;
    memberInfo: {
      firstname: string;
      lastname: string;
      phone: string;
      memberHandle: string;
      memberTier: number;
    };
    accounts: {
      owned: string[];
      authorized: string[];
    };
  };
  message: string;
}
```

### Account Module
```typescript
interface AccountResponse {
  success: boolean;
  data?: {
    accountID: string;
    accountInfo: {
      accountName: string;
      accountHandle: string;
      accountType: string;
      defaultDenom: string;
    };
    balances: BalanceData;
    authorizations: AuthorizationData;
  };
  message: string;
}
```

### Credex Module
```typescript
interface CredexResponse {
  success: boolean;
  data?: {
    credexID: string;
    transactionInfo: {
      amount: string;
      denomination: string;
      type: string;
      status: string;
    };
    security: {
      secured: boolean;
      securerID?: string;
    };
    participants: {
      issuerID: string;
      receiverID: string;
    };
  };
  message: string;
}
```

### Recurring Module
```typescript
interface RecurringResponse {
  success: boolean;
  data?: {
    recurringID: string;
    scheduleInfo: {
      frequency: string;
      nextRunDate: string;
      amount: string;
      denomination: string;
      status: string;
    };
    execution: {
      lastRunDate?: string;
      lastRunStatus?: string;
      totalExecutions: number;
    };
    participants: {
      sourceAccountID: string;
      targetAccountID: string;
    };
  };
  message: string;
}
```

## Error Patterns

### Member Module
```typescript
// Common error codes
const MemberErrorCodes = {
  NOT_FOUND: 404,
  INVALID_PHONE: 400,
  TIER_LIMIT: 403,
  DUPLICATE_HANDLE: 409,
  AUTH_FAILED: 401
};

// Error examples
throw new MemberError("Member not found", "NOT_FOUND", 404);
throw new MemberError("Invalid phone format", "INVALID_PHONE", 400);
```

### Account Module
```typescript
// Common error codes
const AccountErrorCodes = {
  NOT_FOUND: 404,
  AUTH_LIMIT: 400,
  INVALID_TYPE: 400,
  UNAUTHORIZED: 403,
  DUPLICATE_HANDLE: 409
};

// Error examples
throw new AccountError("Account not found", "NOT_FOUND", 404);
throw new AccountError("Authorization limit reached", "AUTH_LIMIT", 400);
```

### Credex Module
```typescript
// Common error codes
const CredexErrorCodes = {
  NOT_FOUND: 404,
  INVALID_AMOUNT: 400,
  INSUFFICIENT_BALANCE: 400,
  ALREADY_PROCESSED: 409,
  UNAUTHORIZED: 403
};

// Error examples
throw new CredexError("Credex not found", "NOT_FOUND", 404);
throw new CredexError("Invalid amount", "INVALID_AMOUNT", 400);
```

### Recurring Module
```typescript
// Common error codes
const RecurringErrorCodes = {
  NOT_FOUND: 404,
  INVALID_SCHEDULE: 400,
  INVALID_AMOUNT: 400,
  SCHEDULE_CONFLICT: 409,
  UNAUTHORIZED: 403,
  ALREADY_CANCELLED: 410
};

// Error examples
throw new RecurringError("Recurring transaction not found", "NOT_FOUND", 404);
throw new RecurringError("Invalid schedule format", "INVALID_SCHEDULE", 400);
```

## Key Takeaways for New Modules

1. Entity Identification:
- Consider if public discovery is needed (handle-based lookup)
- Use UUIDs for all internal operations
- Add additional lookup methods only if required by UX

2. Authorization:
- Define clear authorization hierarchy
- Implement appropriate limit checks
- Consider relationship-based permissions

3. Data Relationships:
- Define clear ownership patterns
- Consider authorization relationships
- Plan for complex relationship queries

4. Response Format:
- Follow standard success/error pattern
- Include appropriate context in responses
- Consider partial success scenarios

5. Error Handling:
- Define module-specific error codes
- Use appropriate HTTP status codes
- Include helpful error messages

6. Database Operations:
- Use appropriate transaction types
- Handle relationship integrity
- Consider performance implications

These patterns should guide new module development while allowing for module-specific requirements and variations.
