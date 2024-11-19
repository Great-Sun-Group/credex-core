# Testing Workplan - Phase 1 Implementation

## Overview
This workplan details the implementation approach for Phase 1 of the Credex test suite refactoring. The focus is on establishing comprehensive unit and integration testing to validate basic functionality of all endpoints and flows within a single day context.

## Test Architecture Analysis

### Current Structure
```
tests/
├── api/
│   ├── endpoints/      # Individual endpoint tests
│   │   ├── acceptcredex.test.ts
│   │   ├── acceptcredexbulk.test.ts
│   │   ├── acceptrecurring.test.ts
│   │   ├── admin/
│   │   ├── authorizeforaccount.test.ts
│   │   ├── cancelcredex.test.ts
│   │   ├── cancelrecurring.test.ts
│   │   ├── createaccount.test.ts
│   │   ├── createcredex.test.ts
│   │   ├── createrecurring.test.ts
│   │   ├── declinecredex.test.ts
│   │   ├── devadmin/
│   │   ├── getaccountbyhandle.test.ts
│   │   ├── getbalances.test.ts
│   │   ├── getcredex.test.ts
│   │   ├── getledger.test.ts
│   │   ├── getmemberbyhandle.test.ts
│   │   ├── getmemberdashboardbyphone.test.ts
│   │   ├── getrecurring.test.ts
│   │   ├── login.test.ts
│   │   ├── onboardmember.test.ts
│   │   ├── setdcoparticipantrate.test.ts
│   │   ├── unauthorizeforaccount.test.ts
│   │   ├── updateaccount.test.ts
│   │   └── updatesendoffersto.test.ts
│   ├── integration/   # Multi-endpoint test sequences
│   │   ├── auth.test.ts
│   │   ├── credex.test.ts 
│   │   ├── dashboard.test.ts
│   │   ├── index.test.ts
│   │   ├── setup.test.ts
│   │   └── types.ts
│   └── utils/         # Shared test utilities
│       ├── auth.ts
│       ├── delay.ts
│       └── request.ts
├── run.js            # Test runner
└── setup.ts          # Test environment setup
```

### Phase 1 Implementation Plan

1. Response Validation Enhancement
- Add standardized response validation for all endpoints based on API reference schemas
- Implement validation for:
  - Action structure (id, type, timestamp, actor, details)
  - Dashboard state validation
  - Error response validation
  - Status code validation

2. Test Data Management
- Create test data generators for:
  - Member profiles
  - Account configurations
  - Credex transactions
  - Recurring payments
- Implement cleanup utilities
- Add data isolation between test runs

3. Authentication Testing
- Enhance JWT validation
- Add client API key validation
- Test rate limiting and bypass functionality
- Validate authorization levels and tier requirements

4. Account Management Testing
- Account creation validation
  - Personal accounts
  - Business accounts
  - Trust accounts with FOUNDATION_AUDITED relationship
    - Verify relationship enables unlimited secured credex issuance
    - Validate secured credex limits based on received cash
    - Compare behavior against non-audited accounts
  - Operations accounts
- Authorization management
  - Add/remove authorized members
  - Validate tier requirements
  - Test authorization limits
- Account updates
  - Name/handle updates
  - Denomination changes
  - DCO participation settings

1. Credex Transaction Testing
- Transaction creation validation
  - Secured credex issuance
    - FOUNDATION_AUDITED accounts: Test unlimited issuance based on cash received
    - Standard accounts: Verify issuance limited to current secured balance
  - Different denominations
  - Amount validation
  - Balance checks
- Transaction state management
  - Pending -> Accepted flow
  - Pending -> Declined flow
  - Pending -> Cancelled flow
- Bulk operations
  - Multiple accept
  - Validation of partial success

1. Balance and Ledger Testing
- Balance calculation validation
  - Secured balances
    - FOUNDATION_AUDITED: Verify cash receipt impact
    - Standard accounts: Normal balance rules
  - Unsecured balances
  - Multi-denomination handling
- Ledger entry validation
  - Transaction records
  - Balance updates
  - Pagination

1. Recurring Payment Testing
- Template creation validation
  - Regular payments
  - DCO participation
  - Subscription handling
- Schedule management
  - Start/end dates
  - Frequency validation
  - Duration handling
- Template state changes
  - Accept/decline flows
  - Cancellation handling

1. Error Handling Testing
- Input validation errors
- Authorization errors
- Resource not found errors
- Business rule violations
  - FOUNDATION_AUDITED specific rules
  - Standard account limits
- Rate limiting errors

1. Integration Testing Sequences
- Member onboarding flow
  - Registration
  - Account creation
  - Initial setup
- Transaction flows
  - Multi-party secured credex balance flows
    - FOUNDATION_AUDITED unlimited issuance
    - Standard account balance limits
    - Behaviour when a FOUNDATION_AUDITED Trust account sells cash back for secured credex at par and at a 4% premium (profit to the Trust account owner)
  - Authorization changes
  - Balance updates
- Administrative flows
  - Account management
  - Transaction monitoring
  - System operations

1.  Test Runner Enhancement
- Add support for:
  - Test sequences
  - Environment selection
  - Data cleanup
  - Error reporting
  - Test data management

## Implementation Priorities

### Priority 1: Core Infrastructure
- Response validation framework
- Test data management
- Authentication testing
- Error handling

### Priority 2: Basic Operations
- Account management
- Simple credex transactions
- Balance validation
- Ledger validation

### Priority 3: Advanced Features
- Recurring payments
- Bulk operations
- Integration sequences
- Administrative functions

## Success Criteria

1. Test Coverage
- All endpoints have basic validation
- Critical paths are tested
- Error scenarios are validated
- Security controls are verified
- FOUNDATION_AUDITED functionality fully tested

2. Code Quality
- Tests are maintainable
- Documentation is clear
- Setup is automated
- Cleanup is reliable

3. Validation Depth
- Response structure verified
- Business rules checked
- State changes confirmed
- Error handling validated

## Implementation Notes

1. Test Independence
- Each test should be runnable in isolation
- Test data should be self-contained
- Cleanup should be automatic
- State should be verifiable

2. Test Performance
- Keep unit tests fast
- Optimize integration sequences
- Manage test data efficiently
- Use appropriate delays

3. Test Maintenance
- Document test purposes
- Use clear naming conventions
- Maintain test data separately
- Keep validation rules updated

4. Development Process
- Start with unit tests
- Build up to integration
- Add business flows
- Maintain documentation

## Next Steps

1. Begin implementation of response validation framework
2. Set up test data management system
3. Enhance authentication testing
4. Implement FOUNDATION_AUDITED relationship testing
5. Start endpoint-specific test implementation
6. Build integration test sequences
7. Document test coverage and results

Note: Multi-day DCO operations and MTQ loop-finding will be handled in a future scale testing phase.
