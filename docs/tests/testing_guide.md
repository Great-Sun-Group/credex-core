# Credex API Testing Guide

This guide provides instructions on how to run tests for the Credex API using our custom test runner.

## Running Tests

Our test runner supports various ways to run tests. Here are the basic patterns:

1. Run all tests:
   ```
   npm test
   npm test dev
   npm test stage
   ```
   No sufix runs in your local dev environment, `dev` runs on dev.api.mycredex.app, `stage` runs on stage.api.mycredex.app`.

2. Run tests for a specific module:
   ```
   npm test Member
   npm test Account
   npm test dev Member
   npm test stage Account
   ```

3. Run a specific test:
   ```
   npm test "should create a new account successfully"
   npm test dev "should create a new account successfully"
   ```

## Environment-specific Behavior

- Local environment (default): Tests run normally without any special flags.
- Development environment (`dev`): Tests run with the `--runInBand` flag to prevent concurrency issues.
- Staging environment (`stage`): Tests run with the `--runInBand` flag to prevent concurrency issues.
