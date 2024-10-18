# Credex API Testing Guide

This guide provides instructions on how to run tests for the Credex API using our custom test runner.

## Running Tests

Our test runner supports various ways to run tests. Here are the basic patterns:

1. Run all tests:
   ```
   npm test
   ```

2. Run all tests in a specific environment:
   ```
   npm test dev
   npm test stage
   ```

3. Run tests for a specific module:
   ```
   npm test Member
   npm test Account
   ```

4. Run tests for a specific module in a specific environment:
   ```
   npm test dev Member
   npm test stage Account
   ```

5. Run a specific test:
   ```
   npm test "should create a new account successfully"
   ```

6. Run a specific test in a specific environment:
   ```
   npm test dev "should create a new account successfully"
   ```

## Examples

Here are some example commands and what they do:

- `npm test`: Runs all tests in the local environment.
- `npm test dev`: Runs all tests in the development environment.
- `npm test Member`: Runs all tests in the Member module in the local environment.
- `npm test dev Account`: Runs all tests in the Account module in the development environment.
- `npm test "should login a member"`: Runs the specific test with the name "should login a member" in the local environment.
- `npm test stage "should create a new account successfully"`: Runs the specific test with the name "should create a new account successfully" in the staging environment.

## Environment-specific Behavior

- Local environment (default): Tests run normally without any special flags.
- Development environment (`dev`): Tests run with the `--runInBand` flag to prevent concurrency issues.
- Staging environment (`stage`): Tests run with the `--runInBand` flag to prevent concurrency issues.

## Troubleshooting

If you encounter any issues while running tests:

1. Ensure you have all dependencies installed: `npm install`
2. Check that your environment variables are set correctly
3. Verify that the API server is running (for integration tests)

For more detailed information on Jest commands and options, refer to the [Jest CLI Options](https://jestjs.io/docs/cli) documentation.

## Contributing New Tests

When adding new tests:

1. Create test files in the appropriate module directory under `tests/api/`
2. Follow the existing patterns for describing test suites and individual tests
3. Ensure your tests cover both successful and error scenarios
4. Run your new tests locally before submitting a pull request

Remember to update this guide if you introduce new testing patterns or commands.
