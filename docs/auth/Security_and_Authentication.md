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

## Authentication Process

1. When a new member is onboarded or an existing member logs in, a JWT token is generated and returned.

2. For subsequent requests to protected routes, the client should include the JWT token in the Authorization header of the request:

   ```
   Authorization: Bearer <token>
   ```

3. The server will validate the token for each request to a protected route. If the token is valid, the request will be processed. If not, a 401 Unauthorized response will be returned.

4. After each request, check the Authorization header in the response for a new token. Always use the most recent token for subsequent requests.

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to be permissive, allowing requests from all origins. This setup facilitates integration with various front-end applications and third-party services.

- All origins are allowed (`origin: '*'`)
- Supported methods: GET, POST, PUT, DELETE
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

## Implementation Details

Key parts of the code that implement these protections:

1. In `config/authenticate.ts`:
   ```typescript
   const authenticate = async (req: UserRequest, res: Response, next: NextFunction) => {
     // ... (token verification)
     const result = await session.run(
       'MATCH (m:Member {id: $memberId}) RETURN m',
       { memberId: decoded.memberId }
     );
     // ... (check if member exists and attach to request)
   };
   ```

2. In `src/middleware/authMiddleware.ts`:
   ```typescript
   export const authMiddleware = (requiredRoles: string[] = []) => {
     return async (req: UserRequest, res: Response, next: NextFunction) => {
       // ... (authentication and role checking)
     };
   };
   ```

3. In `src/middleware/rateLimiter.ts`:
   ```typescript
   const memberLimiter = rateLimit({
     windowMs: 60 * 1000, // 1 minute
     max: 10, // limit to 10 requests per minute per member
     keyGenerator: (req: Request): string => {
       // Use the authenticated member's ID as the rate limit key, or fall back to IP address
       return req.user?.id || req.ip || req.socket.remoteAddress || 'unknown';
     },
     // ... (handler configuration)
   });
   ```

4. In `src/middleware/securityConfig.ts`:
   ```typescript
   export const applySecurityMiddleware = (app: Application) => {
     // ... (Helmet configuration)
     app.use(cors(corsOptions));
     app.use(authMiddleware);
     app.use(rateLimiter);
     // ...
   };
   ```

These mechanisms work together to ensure that each request is properly authenticated, authorized for the specific member making the request, and within the allowed rate limits.

## Security Recommendations

To further enhance security, consider implementing:

1. HTTPS to encrypt all communications, preventing token interception.
2. Token revocation or a blacklist for logged-out users.
3. Refresh tokens for longer sessions.
4. Fine-tuning CORS settings if a more restrictive policy is needed.
5. Adjusting rate limits based on observed usage patterns and server capacity.

## Important Notes

- It's crucial to ensure that the JWT_SECRET is kept secure and properly set in the environment variables.
- Make sure to set the `JWT_SECRET` environment variable in your `.env` file. This secret is used to sign and verify the JWT tokens. You can create your own random string for this.
- Regularly review logs for rate-limited requests to identify potential abuse or the need for limit adjustments.

## Conclusion

The current implementation provides robust protection against unauthorized access, member impersonation, and API abuse. The combination of JWT authentication, permissive CORS settings, and rate limiting offers a balance between accessibility and security. However, security is an ongoing process, and it's important to regularly review and update security measures as needed, especially in response to changing requirements or observed usage patterns.