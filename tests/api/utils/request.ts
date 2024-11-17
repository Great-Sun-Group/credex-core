import axios from "../../setup";
import type { AxiosRequestConfig, RawAxiosRequestHeaders } from "axios";

/**
 * Helper function for authenticated requests
 * @param endpoint API endpoint path
 * @param data Request body data
 * @param token Optional JWT token
 * @param config Optional axios config overrides
 */
export const authRequest = async (
  endpoint: string,
  data: any,
  token?: string,
  config: AxiosRequestConfig = {}
) => {
  // Merge headers
  const headers: RawAxiosRequestHeaders = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(process.env.SKIP_RATE_LIMITER_KEY && {
      "x-skip-rate-limit": process.env.SKIP_RATE_LIMITER_KEY,
    }),
    ...(config.headers || {})
  };

  // Merge config
  const finalConfig: AxiosRequestConfig = {
    ...config,
    headers
  };

  console.log("Making request to:", endpoint);
  console.log("With data:", data);
  console.log("And config:", finalConfig);

  return axios.post(endpoint, data, finalConfig);
};
