# Security and Authentication Overview

This document provides a comprehensive overview of the security measures and authentication process implemented in our application, with a focus on JWT (JSON Web Token) authentication, CORS configuration, and rate limiting.

## JWT Authentication

Our application uses JSON Web Tokens (JWT) for authentication. This setup provides protection against unauthorized access and ensures that only the appropriate member is authorized on the endpoints.

### Key Features

1. **Token Generation and Verification**

   - JWT tokens are generated with member-specific information and signed with a secret key.
   - Tokens are verified on each request using the same secret key.

2. **Member-specific Authorization**

   - After token verification, the system fetches the member's information from the database using the ID in the token.
   - This ensures that the token corresponds to an actual member in the system.

3. **Short-lived Tokens with Automatic Refresh**

   - Tokens expire after 5 minutes of inactivity, reducing the risk of token misuse.
   - Automatic token refresh is implemented for valid sessions.
   - The token's expiration is extended with each valid request.
   - If no requests are made for 5 minutes, the token will expire, and the user will need to log in again.

4. **Role-based Access Control**
   - The authMiddleware supports role-based access control for fine-grained permissions.

### Authentication Process

1. When a new member is onboarded or an existing member logs in, a JWT token is generated and returned.

2. For subsequent requests to protected routes, the client should include the JWT token in the Authorization header of the request:

   ```
   Authorization: Bearer <token>
   ```

3. The server will validate the token for each request to a protected route. If the token is valid, the request will be processed. If not, a 401 Unauthorized response will be returned.

4. After each request, check the Authorization header in the response for a new token. Always use the most recent token for subsequent requests.

### Keyholes

The /v1/login and /v1/onboardMember routes are keyholes in the JWT authorization layer so that members can onboard and login when they do not have valid JWT tokens.

If any request in your client application returns a `400 Bad Request` or `401 Unauthorized` code, hit the login endpoint with the phone number. If the login endpoint returns `400 Bad Request` instead of `200 OK` and a valid token, request user name to onboard a new member with the onboardMember endpoint.

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is currently configured to be permissive, allowing requests from all origins. This setup facilitates integration with various front-end applications and third-party services.

- All origins are allowed (`origin: '*'`)
- Supported methods: GET, POST, PUT, PATCH, DELETE
- Allowed headers: Content-Type, Authorization
- Credentials are allowed
- Preflight requests are cached for 1 day (86400 seconds)

While this configuration is more open, it's important to note that authentication and rate limiting are still in place to protect the API.

## Rate Limiting

To protect the API from abuse and ensure fair usage, rate limiting has been implemented based on authenticated members.

- Limit: 10 requests per minute per member or IP address
- The rate limiter uses the authenticated member's ID as the primary key for limiting
- If the member ID is not available, it falls back to using the IP address or remote address
- When the rate limit is exceeded, a 429 (Too Many Requests) status code is returned

## Implementation Locations:

1. [config/authenticate.ts](config/authenticate.ts)
2. [src/middleware/authMiddleware.ts](consrc/middleware/authMiddleware.ts)
3. [src/middleware/rateLimiter.ts](src/middleware/rateLimiter.ts)
4. [src/middleware/securityConfig.ts](src/middleware/securityConfig.ts)

These mechanisms work together to ensure that each request is properly authenticated, authorized for the specific member making the request, and within the allowed rate limits.

## Important Notes

- It's crucial to ensure that the JWT_SECRET is kept secure and properly set in the environment variables.
- Make sure to set the `JWT_SECRET` environment variable in your `.env` file. This secret is used to sign and verify the JWT tokens. You can create your own random string for this in dev environments.
- Regularly review logs for rate-limited requests to identify potential abuse or the need for limit adjustments.

# Keyholes

The /v1/login and /v1/onboardMember routes are keyholes in the JWT authorization layer so that members can onboard and login when they do not have valid JWT tokens.

## Endpoint: `/v1/login`

This endpoint is used for both new and existing members to log in or attempt to access the system.

### Request

- **Method:** POST
- **Headers:** No special authentication headers required
- **Body:**
  ```json
  {
    "phone": "string"
  }
  ```
  The `phone` should be a valid international phone number.

### Responses

#### Successful Login (Existing Member)

- **Status Code:** 200 OK
- **Body:**
  ```json
  {
    "token": "string"
  }
  ```
  The `token` is a JWT that can be used for subsequent authenticated requests.

#### Failed Login (No Matching Member or Invalid Phone)

- **Status Code:** 400 Bad Request
- **Body:**
  ```json
  {
    "message": "string"
  }
  ```
  The `message` will provide details about the failure, such as "Failed to login member" or a more specific error message.

### Notes

- The same 400 status code is used for both invalid phone numbers and failed logins (including non-existent members).
- To distinguish between these cases, check the specific error message in the response body.
- For security reasons, the API does not explicitly state whether a member exists or not.

## Endpoint: `/v1/onboardMember`

This endpoint is used to onboard new members into the system. It creates a new member account and returns a JWT token for authentication.

### Request

- **Method:** POST
- **Headers:** No special authentication headers required
- **Body:**
  ```json
  {
    "firstname": "string",
    "lastname": "string",
    "phone": "string"
  }
  ```
  - `firstname`: The first name of the new member
  - `lastname`: The last name of the new member
  - `phone`: A valid international phone number

### Responses

#### Successful Onboarding

- **Status Code:** 201 Created
- **Body:**
  ```json
  {
    "token": "string",
    "member": {
      "id": "string",
      "firstname": "string",
      "lastname": "string",
      "phone": "string"
    }
  }
  ```
  - `token`: A JWT that can be used for subsequent authenticated requests
  - `member`: An object containing the newly created member's details

#### Failed Onboarding

- **Status Code:** 400 Bad Request
- **Body:**
  ```json
  {
    "message": "string"
  }
  ```
  The `message` will provide details about the failure, such as "Failed to onboard member" or a more specific error message.

### Notes

- This endpoint should only be used for new members. If an account with the provided phone number already exists, the onboarding will fail.
- The system performs validation on the input data:
  - The phone number must be in a valid international format
  - The firstname and lastname must not be empty
- After successful onboarding, the returned JWT token can be used immediately for authenticated requests.
- For security and privacy reasons, detailed error messages about existing accounts are not provided to prevent enumeration attacks.
