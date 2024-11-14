import axios from "../../setup";

// Helper function for authenticated requests (JWT only)
export const authRequest = async (
  endpoint: string,
  data: any,
  token?: string
) => {
  // Include both authorization and rate limiter bypass headers
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(process.env.SKIP_RATE_LIMITER_KEY && {
      "x-skip-rate-limit": process.env.SKIP_RATE_LIMITER_KEY,
    }),
  };

  const config = { headers };

  console.log("Making request to:", endpoint);
  console.log("With data:", data);
  console.log("And config:", config);

  return axios.post(endpoint, data, config);
};
