import type { AxiosError } from "axios";
import { authRequest } from "./request";
import { delay, DELAY_MS } from "./delay";

// Login helper that returns jwt and memberID
export const loginMember = async (phone: string): Promise<{jwt: string, memberID: string}> => {
  try {
    const loginResponse = await authRequest("/login", { phone });
    if (loginResponse.status !== 200 || !loginResponse.data.token) {
      throw new Error("Login failed");
    }
    
    // Get member dashboard to extract memberID
    const dashboardResponse = await authRequest(
      "/getMemberDashboardByPhone",
      { phone },
      loginResponse.data.token
    );
    if (dashboardResponse.status !== 200) {
      throw new Error("Failed to get member dashboard");
    }

    await delay(DELAY_MS);

    return {
      jwt: loginResponse.data.token,
      memberID: dashboardResponse.data.memberID
    };
  } catch (err) {
    const error = err as AxiosError;
    console.error("Login error:", error.response?.data || error.message);
    throw error;
  }
};
