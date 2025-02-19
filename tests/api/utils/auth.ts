import axios from "../../setup";

import { AxiosRequestConfig } from "axios";

/**
 * Make an authenticated request to the API
 * @param endpoint The API endpoint to call
 * @param data The request body data
 * @param jwt Optional JWT token for authentication
 * @returns Axios response
 */
export const authRequest = async (endpoint: string, data: any, jwt?: string) => {
  const headers: AxiosRequestConfig["headers"] = {
    "Content-Type": "application/json",
    "x-client-api-key": process.env.CLIENT_API_KEY || ""
  };

  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  return axios.post(endpoint, data, { headers });
};
