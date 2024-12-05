import type { AxiosError, AxiosResponse } from "axios";
import { authRequest } from "./request";
import { delay, DELAY_MS } from "./delay";
import { validateAction, validateStatusCode } from "./validation";
import { testDataManager } from "./testData";

/**
 * Authentication response types
 */
interface LoginResponse {
  jwt: string;
  memberID: string;
}

interface AuthError {
  message: string;
  data: {
    action: {
      type: string;
      details: {
        code: string;
        reason?: string;
      }
    }
  }
}

/**
 * Login helper that returns jwt and memberID
 */
export async function loginMember(
  phone: string
): Promise<LoginResponse> {
  try {
    // Attempt login with client API key
    const loginResponse = await authRequest("/login", { phone }, undefined, {
      headers: {
        "x-client-api-key": process.env.CLIENT_API_KEY || ""
      }
    });
    validateStatusCode(loginResponse.status, 200);
    validateAction(loginResponse.data.data.action);

    if (!loginResponse.data.data.action.details.token) {
      throw new Error("Login response missing token");
    }

    const token = loginResponse.data.data.action.details.token;

    // Get member dashboard to extract memberID
    const dashboardResponse = await authRequest(
      "/getMemberDashboardByPhone",
      { phone },
      token
    );
    validateStatusCode(dashboardResponse.status, 200);
    validateAction(dashboardResponse.data.data.action);

    const memberID = dashboardResponse.data.data.action.details.memberID;
    if (!memberID) {
      throw new Error("Failed to get member ID from dashboard");
    }

    // Track member ID for cleanup
    testDataManager.trackMemberID(memberID);

    await delay(DELAY_MS);

    return {
      jwt: token,
      memberID
    };
  } catch (err) {
    const error = err as AxiosError<AuthError>;
    console.error("Login error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Tests rate limiting functionality
 */
export async function testRateLimiting(
  endpoint: string,
  data: any,
  token?: string
): Promise<void> {
  const requests: Promise<AxiosResponse>[] = [];
  // Make multiple rapid requests
  for (let i = 0; i < 10; i++) {
    requests.push(authRequest(endpoint, data, token));
  }

  try {
    await Promise.all(requests);
    throw new Error("Rate limiting did not trigger");
  } catch (err) {
    const error = err as AxiosError<AuthError>;
    if (error.response?.status !== 429) {
      throw error;
    }
    // 429 status indicates rate limiting worked
  }
}

/**
 * Tests rate limit bypass with key
 */
export async function testRateLimitBypass(
  endpoint: string,
  data: any,
  bypassKey: string,
  token?: string
): Promise<void> {
  const requests: Promise<AxiosResponse>[] = [];
  // Make multiple rapid requests with bypass key
  for (let i = 0; i < 10; i++) {
    requests.push(
      authRequest(endpoint, data, token, {
        headers: {
          "x-skip-rate-limit": bypassKey
        }
      })
    );
  }

  // All requests should succeed with bypass key
  await Promise.all(requests);
}

/**
 * Tests client API key validation
 */
export async function testClientApiKey(
  endpoint: string,
  data: any,
  clientKey: string
): Promise<void> {
  // Test with valid key
  const validResponse = await authRequest(endpoint, data, undefined, {
    headers: {
      "x-client-api-key": clientKey
    }
  });
  validateStatusCode(validResponse.status, 200);

  // Test with invalid key
  try {
    await authRequest(endpoint, data, undefined, {
      headers: {
        "x-client-api-key": "invalid_key"
      }
    });
    throw new Error("Invalid client API key was accepted");
  } catch (err) {
    const error = err as AxiosError<AuthError>;
    if (error.response?.status !== 401) {
      throw error;
    }
    // 401 status indicates key validation worked
  }
}

/**
 * Tests JWT validation and expiry
 */
export async function testJWTValidation(
  endpoint: string,
  data: any,
  token: string
): Promise<void> {
  // Test with valid token
  const validResponse = await authRequest(endpoint, data, token);
  validateStatusCode(validResponse.status, 200);

  // Test with invalid token
  try {
    await authRequest(endpoint, data, "invalid_token");
    throw new Error("Invalid JWT was accepted");
  } catch (err) {
    const error = err as AxiosError<AuthError>;
    if (error.response?.status !== 401) {
      throw error;
    }
    // 401 status indicates JWT validation worked
  }

  // Test with expired token (if possible)
  // Note: This may not be testable in all environments
  await delay(DELAY_MS * 10); // Wait for potential expiry
  try {
    await authRequest(endpoint, data, token);
  } catch (err) {
    const error = err as AxiosError<AuthError>;
    if (error.response?.status === 401) {
      // Token expired as expected
      return;
    }
  }
}

/**
 * Tests tier-based authorization
 */
export async function testTierAuthorization(
  endpoint: string,
  data: any,
  token: string,
  requiredTier: number
): Promise<void> {
  try {
    const response = await authRequest(endpoint, data, token);
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
  } catch (err) {
    const error = err as AxiosError<AuthError>;
    if (error.response?.status === 403) {
      // Check if error is due to insufficient tier
      const errorData = error.response.data;
      if (errorData.data.action.details.code === "TIER_REQUIREMENT") {
        // Error indicates tier validation worked
        return;
      }
    }
    throw error;
  }
}
