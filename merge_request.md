# Implement Intuitive Test Runner for Credex API

This merge request introduces a new, more flexible and intuitive testing system for the Credex API, with a focus on comprehensive testing of the Member module and initial tests for the Account module.

## Summary of Changes

- Created a custom test runner script (`tests/run.js`) to handle various test scenarios
- Updated `package.json` to use the new test runner
- Updated testing guide with comprehensive instructions for new testing commands
- Implemented and fixed tests for all six endpoints in the Member module:
  1. onboardMember
  2. login
  3. getMemberByHandle
  4. getMemberDashboardByPhone
  5. authForTierSpendLimit
  6. setDCOparticipantRate
- Added initial tests for the Account module endpoints:
  1. createAccount
  2. getAccountByHandle
  3. updateAccount
  4. authorizeForAccount
  5. unauthorizeForAccount
  6. updateSendOffersTo

## Key Features

- Run all tests or tests for specific modules
- Easy environment switching (local, dev, stage)
- Run specific tests by name
- Intuitive command structure (e.g., `npm test dev Member`)

## Improvements

- Fixed issue with phone number format in Member tests
- Ensured all Member module tests pass successfully
- Improved test reliability and consistency
- Addressed tier spend limit constraints in tests
- Added basic structure for Account module tests

## Test Coverage

All six endpoints in the Member module are now covered by passing tests:

1. Onboarding a new member
2. Logging in a member
3. Getting member by handle
4. Getting member dashboard by phone
5. Authenticating for tier spend limit
6. Setting DCO participant rate

Initial tests have been added for all six endpoints in the Account module:

1. Creating a new account
2. Getting account by handle
3. Updating an existing account
4. Authorizing a member for an account
5. Unauthorizing a member for an account
6. Updating send offers to

## Known Issues

- The Account module tests are currently failing with 404 errors. This needs to be investigated and resolved in a future task.

## Next Steps

- Debug and fix the Account module tests to ensure they pass successfully
- Apply similar comprehensive testing to other API modules (e.g., Avatar, Credex)
- Implement additional test scenarios for edge cases and error handling
- Set up CI/CD pipeline to run these tests automatically on code changes
- Review and update the testing guide as new testing patterns or requirements emerge

This merge request significantly improves the testing infrastructure for the Credex API, particularly for the Member module and lays the groundwork for comprehensive testing of the Account module, ensuring more robust and reliable code.
