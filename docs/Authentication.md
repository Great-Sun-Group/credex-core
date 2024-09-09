# Authentication

The Credex API uses JWT (JSON Web Tokens) for authentication. Here's how it works:

1. When a new member is onboarded or an existing member logs in, a JWT token is generated and returned.

2. For subsequent requests to protected routes, the client should include the JWT token in the Authorization header of the request:

   ```
   Authorization: Bearer <token>
   ```

3. The server will validate the token for each request to a protected route. If the token is valid, the request will be processed. If not, a 401 Unauthorized response will be returned.

4. The JWT token contains the member's ID and a timestamp of the last activity, which are used to identify the member and manage token expiration for each request.

5. Tokens are refreshed with every request and expire 5 minutes after the last request. This means:
   - The token's expiration is extended with each valid request.
   - If no requests are made for 5 minutes, the token will expire, and the user will need to log in again.

6. For authenticated requests, use the JWT token received from the onboarding or login process in the Authorization header:

   ```
   Authorization: Bearer <your_jwt_token>
   ```

7. After each request, check the Authorization header in the response for a new token. Always use the most recent token for subsequent requests.

Note: Make sure to set the `JWT_SECRET` environment variable in your `.env` file. This secret is used to sign and verify the JWT tokens. You can create your own random string for this.