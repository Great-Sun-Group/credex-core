# API Tests

This directory contains automated tests for the API endpoints. The tests are designed to run in a GitHub Codespaces environment and use both GitHub authentication and API-specific authentication.

## Test Files

- `api/authenticatedRequests.test.ts`: Tests authenticated API endpoints

## Running the Tests

To run the tests:

1. Ensure your API server is running in the Codespace.
2. Open a new terminal in your Codespace.
3. Run the following command:

   ```
   npm test src/tests/api/authenticatedRequests.test.ts
   ```

## Environment Setup

The tests are designed to run in a GitHub Codespaces environment. They rely on two environment variables:

- `CODESPACE_NAME`: Automatically set by GitHub Codespaces
- `GITHUB_TOKEN`: Automatically set by GitHub Codespaces

These variables are used to construct the base URL for API requests and for initial authentication.

The base URL is constructed as: `https://${CODESPACE_NAME}-5000.app.github.dev`

## Authentication Process

The tests use a two-step authentication process:

1. GitHub Token: Used for initial authentication and is included in all requests.
2. API Token: Obtained by creating a test user and logging in. This token is then used for subsequent API requests.

## Test Structure

The main test file (`authenticatedRequests.test.ts`) includes:

1. A setup process that creates a test user and obtains an API token.
2. Individual test cases for different API endpoints.
3. A cleanup process (currently a placeholder - implement as needed).

## Tested Endpoints

Currently, the following endpoints are tested:

1. POST `/api/member/onboardMember`: Creates a new test user
2. POST `/api/member/login`: Logs in the test user and obtains an API token
3. GET `/api/account`: Retrieves account data
4. POST `/api/credex/offer`: Creates a new credex offer
5. GET `/api/credex`: Retrieves a list of credex offers

## Troubleshooting

If tests fail, check the following:

1. Verify that the API server is running and accessible.
2. Check the console output for detailed error messages and API responses.
3. Ensure that the API endpoints in the tests match those implemented on the server.
4. Verify that both GitHub token and API token authentication are correctly implemented on the server side.
5. Check for any middleware or server-side components that might be interfering with requests.
6. If you're getting 404 errors, double-check that the API routes are correct and that the server is set up to handle requests at the `/api` path.

## Expanding the Tests

To add new tests:

1. Follow the pattern in `authenticatedRequests.test.ts`.
2. Use the `axiosInstance` for making authenticated requests.
3. Add detailed logging to help with debugging.
4. Ensure proper error handling and informative error messages.

## Retry Mechanism

The tests include a retry mechanism for the initial server check. If the server is not immediately responsive, the tests will retry connecting a few times before failing. This helps handle cases where the server might take a moment to start up.

Remember to update this README if you make significant changes to the testing process or add new test files.